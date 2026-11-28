import { useIsFocused } from '@react-navigation/native';
import { requireOptionalNativeModule } from 'expo';
import { useAtomValue, useStore } from 'jotai';
import { useEffect, useMemo, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { TransportType } from '~/@types/graphql';
import { useEstimateArrivalTimesRoute } from '~/hooks/useEstimateArrivalTimesRoute';
import { useIsAppActive } from '~/hooks/useIsAppActive';
import { useNextStation } from '~/hooks/useNextStation';
import {
  buildLeg,
  findImuOriginIndex,
  ImuShadowEstimator,
  type Leg,
} from '~/lib/imuShadow';
import { loadImuShadowSensor, readMotionSample } from '~/lib/imuShadowSensor';
import { getTrackDistance } from '~/lib/trackDistances';
import { applyImuArrivalAtom } from '~/store/atoms/imuArrival';
import { imuShadowEnabledAtom } from '~/store/atoms/imuShadow';
import { backgroundLocationTrackingAtom } from '~/store/atoms/location';
import { autoModeEnabledAtom } from '~/store/atoms/navigation';
import {
  arrivedAtom,
  clearImuDepartureAtom,
  selectedBoundAtom,
  selectedDirectionAtom,
  showImuDepartureAtom,
  stationAtom,
  stationsAtom,
} from '~/store/atoms/station';

export const DevImuArrival = () => {
  const nativeMotion = useMemo(
    () =>
      Platform.OS === 'android'
        ? requireOptionalNativeModule<{
            setRideBackgroundEnabled?: (enabled: boolean) => void;
          }>('ExponentDeviceMotion')
        : null,
    []
  );
  const supportsBackground =
    Platform.OS === 'ios' || !!nativeMotion?.setRideBackgroundEnabled;
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
  const tracking = useAtomValue(backgroundLocationTrackingAtom);
  const activeRide = focused && !simulation && !shadow;
  const displayedLeg = useRef<Leg | null>(null);
  useEffect(() => {
    if (!activeRide) return;
    return () => {
      if (displayedLeg.current)
        store.set(clearImuDepartureAtom, displayedLeg.current);
      displayedLeg.current = null;
    };
  }, [activeRide, store]);
  const enabled =
    activeRide &&
    origin?.line?.transportType === TransportType.Rail &&
    target?.line?.transportType === TransportType.Rail &&
    (active || (tracking && supportsBackground));
  const { route } = useEstimateArrivalTimesRoute({ skip: !enabled });

  useEffect(() => {
    if (!enabled || !tracking || !nativeMotion?.setRideBackgroundEnabled)
      return;
    nativeMotion.setRideBackgroundEnabled(true);
    return () => nativeMotion.setRideBackgroundEnabled?.(false);
  }, [enabled, tracking, nativeMotion]);

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
    const startIndex = findImuOriginIndex(
      route.stops,
      origin.id,
      origin.groupId
    );
    if (startIndex == null) return;
    const leg = buildLeg(route.stops, startIndex, getTrackDistance)?.leg;
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
        if (Platform.OS !== 'android') {
          // A new leg can start while locked. Only ask for a new grant in the foreground.
          let permission = await sensor.getPermissionsAsync();
          if (disposed) return;
          if (!permission.granted) {
            if (AppState.currentState !== 'active') {
              started = false;
              return;
            }
            permission = await sensor.requestPermissionsAsync();
          }
          if (disposed || !permission.granted) return;
        }
        if (!store.get(arrivedAtom)) return;
        const estimator = new ImuShadowEstimator(leg);
        let departureDetected = false;
        let lastSampleTime = Number.NEGATIVE_INFINITY;
        sensor.setUpdateInterval(100);
        subscription = sensor.addListener((data) => {
          if (
            disposed ||
            (AppState.currentState !== 'active' &&
              !(
                supportsBackground && store.get(backgroundLocationTrackingAtom)
              ))
          )
            return;
          const sample = readMotionSample(data);
          // Android may deliver individual sensors before the first complete sample.
          // The estimator checks the elapsed native time between complete samples.
          if (
            !sample ||
            sample.rotationDegPerSecond == null ||
            sample.timeMs <= lastSampleTime
          )
            return;
          lastSampleTime = sample.timeMs;
          const value = estimator.step(sample, performance.now());
          if (!departureDetected && value.phase === 'accelerating') {
            departureDetected = true;
            const shown = store.set(showImuDepartureAtom, {
              leg,
              originGroupId: origin.groupId,
              stations,
              direction,
              bound,
            });
            if (shown) displayedLeg.current = leg;
          }
          // Loss of distance tracking does not cancel an already confirmed departure.
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
    const appStateSubscription = AppState.addEventListener(
      'change',
      (state) => {
        if (state === 'active') void start();
      }
    );
    return () => {
      appStateSubscription.remove();
      disposed = true;
      unsubscribe();
      subscription?.remove();
    };
  }, [
    enabled,
    route,
    origin,
    target,
    bound,
    direction,
    stations,
    store,
    supportsBackground,
  ]);
  return null;
};
