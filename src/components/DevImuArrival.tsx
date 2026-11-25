import { useIsFocused } from '@react-navigation/native';
import { useAtomValue, useStore } from 'jotai';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { LineType } from '~/@types/graphql';
import { useEstimateArrivalTimesRoute } from '~/hooks/useEstimateArrivalTimesRoute';
import { useIsAppActive } from '~/hooks/useIsAppActive';
import { useNextStation } from '~/hooks/useNextStation';
import { buildLeg, ImuShadowEstimator } from '~/lib/imuShadow';
import { loadImuShadowSensor, readMotionSample } from '~/lib/imuShadowSensor';
import { getTrackDistance } from '~/lib/trackDistances';
import { applyImuArrivalAtom } from '~/store/atoms/imuArrival';
import { imuShadowEnabledAtom } from '~/store/atoms/imuShadow';
import { autoModeEnabledAtom } from '~/store/atoms/navigation';
import {
  arrivedAtom,
  selectedBoundAtom,
  selectedDirectionAtom,
  stationAtom,
  stationsAtom,
} from '~/store/atoms/station';

export const DevImuArrival = () => {
  const store = useStore();
  const origin = useAtomValue(stationAtom);
  const target = useNextStation(true, origin ?? undefined);
  const stations = useAtomValue(stationsAtom);
  const direction = useAtomValue(selectedDirectionAtom);
  const bound = useAtomValue(selectedBoundAtom);
  const simulation = useAtomValue(autoModeEnabledAtom);
  const shadow = useAtomValue(imuShadowEnabledAtom);
  const active = useIsAppActive();
  const focused = useIsFocused();
  const enabled =
    focused &&
    active &&
    !simulation &&
    !shadow &&
    origin?.line?.lineType === LineType.Subway &&
    target?.line?.lineType === LineType.Subway;
  const { route } = useEstimateArrivalTimesRoute({ skip: !enabled });

  useEffect(() => {
    if (
      !enabled ||
      !origin ||
      !target ||
      !bound ||
      !direction ||
      !route?.stops ||
      target.id == null ||
      origin.id == null
    )
      return;
    const starts = route.stops.flatMap((stop, i) =>
      stop.stopsHere && stop.stationId === origin.id ? [i] : []
    );
    if (starts.length !== 1) return;
    const leg = buildLeg(route.stops, starts[0], getTrackDistance)?.leg;
    if (
      !leg?.distanceM ||
      (leg.toId !== target.id && !leg.toAliases?.includes(target.id))
    )
      return;

    let disposed = false;
    let started = false;
    let subscription: { remove(): void } | undefined;
    const start = async () => {
      if (started || !store.get(arrivedAtom)) return;
      started = true;
      try {
        const sensor = await loadImuShadowSensor();
        if (disposed) return;
        const available = await sensor.isAvailableAsync();
        if (disposed || !available) return;
        const permission = await sensor.requestPermissionsAsync();
        if (disposed || !permission.granted || !store.get(arrivedAtom)) return;
        const estimator = new ImuShadowEstimator(leg);
        let lastSampleTime = Number.NEGATIVE_INFINITY;
        sensor.setUpdateInterval(100);
        subscription = sensor.addListener((data) => {
          if (disposed || AppState.currentState !== 'active') return;
          const sample = readMotionSample(data);
          if (sample && sample.timeMs <= lastSampleTime) return;
          if (sample) lastSampleTime = sample.timeMs;
          const value = sample
            ? estimator.step(sample, performance.now())
            : estimator.invalidate('missing-motion');
          if (value.phase === 'invalid') {
            subscription?.remove();
            subscription = undefined;
          }
          if (value.arrivalCandidate) {
            store.set(applyImuArrivalAtom, {
              origin,
              target,
              stations,
              direction,
              bound,
            });
          }
        });
      } catch {
        // Native motion can be unavailable on an existing JS-only build.
      }
    };
    void start();
    const unsubscribe = store.sub(arrivedAtom, () => void start());
    return () => {
      disposed = true;
      unsubscribe();
      subscription?.remove();
    };
  }, [enabled, route, origin, target, bound, direction, stations, store]);
  return null;
};
