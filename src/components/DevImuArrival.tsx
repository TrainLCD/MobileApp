import { useIsFocused } from '@react-navigation/native';
import { requireOptionalNativeModule } from 'expo';
import { type ExtractAtomValue, useAtomValue, useStore } from 'jotai';
import { useEffect, useMemo, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { type Station, TransportType } from '~/@types/graphql';
import { useEstimateArrivalTimesRoute } from '~/hooks/useEstimateArrivalTimesRoute';
import { useIsAppActive } from '~/hooks/useIsAppActive';
import { useNextStation } from '~/hooks/useNextStation';
import {
  buildLeg,
  findImuOriginIndex,
  hasReachedImuArrivalTime,
  ImuShadowEstimator,
  type Leg,
  MAX_GAP_SECONDS,
} from '~/lib/imuShadow';
import { loadImuShadowSensor, readMotionSample } from '~/lib/imuShadowSensor';
import type { ImuStopTrial, StopTrialPhase } from '~/lib/imuStopTrial';
import { getTrackDistance } from '~/lib/trackDistances';
import type { LineDirection } from '~/models/Bound';
import { applyImuArrivalAtom } from '~/store/atoms/imuArrival';
import {
  imuShadowEnabledAtom,
  recordedRidePhaseAtom,
} from '~/store/atoms/imuShadow';
import { backgroundLocationTrackingAtom } from '~/store/atoms/location';
import { manualStationCorrectionAtom } from '~/store/atoms/manualStationCorrection';
import { autoModeEnabledAtom } from '~/store/atoms/navigation';
import {
  arrivedAtom,
  clearImuDepartureAtom,
  sameRouteStation,
  sameRouteStops,
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
  const rideMode =
    focused && !simulation ? (shadow ? 'recording' : 'guidance') : null;
  const displayedLeg = useRef<Leg | null>(null);
  const session = useRef<{
    trial: ImuStopTrial | null;
    station: Station;
    target: Station | null;
    stations: Station[];
    bound: Station;
    direction: LineDirection;
    correction: ExtractAtomValue<typeof manualStationCorrectionAtom>;
    timeMs: number | null;
    phase: StopTrialPhase;
    firstDepartureMs: number | null;
    distanceInterrupted: boolean;
  } | null>(null);
  useEffect(() => {
    if (!rideMode) return;
    return () => {
      if (displayedLeg.current)
        store.set(clearImuDepartureAtom, displayedLeg.current);
      displayedLeg.current = null;
      session.current = null;
    };
  }, [rideMode, store]);
  const enabled =
    !!rideMode &&
    origin?.line?.transportType === TransportType.Rail &&
    target?.line?.transportType === TransportType.Rail &&
    (active || (tracking && supportsBackground));
  const { route } = useEstimateArrivalTimesRoute({ skip: !enabled });

  useEffect(() => {
    if (
      !enabled ||
      shadow ||
      !tracking ||
      !nativeMotion?.setRideBackgroundEnabled
    )
      return;
    nativeMotion.setRideBackgroundEnabled(true);
    return () => nativeMotion.setRideBackgroundEnabled?.(false);
  }, [enabled, shadow, tracking, nativeMotion]);

  useEffect(() => {
    if (
      !enabled ||
      !origin ||
      !target ||
      !bound ||
      !direction ||
      target.id == null ||
      origin.id == null
    )
      return;
    let leg: Leg | undefined;
    if (route?.stops) {
      const startIndex = findImuOriginIndex(
        route.stops,
        origin.id,
        origin.groupId
      );
      if (startIndex == null) return;
      leg = buildLeg(route.stops, startIndex, getTrackDistance)?.leg;
    } else if (
      origin.id !== target.id &&
      stations.filter((s) => s.id === origin.id).length === 1 &&
      stations.some((s) => s.id === target.id)
    ) {
      // useNextStation already resolves the next scheduled stop and skips passes.
      leg = {
        fromId: origin.id,
        toId: target.id,
        distanceM: null,
        etaSeconds: null,
        missingPairs: [],
      };
    }
    if (!leg || (leg.toId !== target.id && !leg.toAliases?.includes(target.id)))
      return;

    const context = { origin, target, stations, direction, bound };
    const saved = session.current;
    const correction = store.get(manualStationCorrectionAtom);
    const ride =
      saved &&
      sameRouteStation(saved.station, origin) &&
      (saved.target == null || sameRouteStation(saved.target, target)) &&
      sameRouteStops(saved.stations, stations) &&
      sameRouteStation(saved.bound, bound) &&
      saved.direction === direction &&
      saved.correction === correction
        ? saved
        : {
            trial: null,
            station: origin,
            target,
            stations,
            bound,
            direction,
            correction,
            timeMs: null,
            phase: 'waiting' as StopTrialPhase,
            firstDepartureMs: null,
            distanceInterrupted: false,
          };
    ride.target = target;
    session.current = ride;
    const applyPhase = (phase: StopTrialPhase | null, timeMs: number) => {
      if (session.current !== ride || phase === ride.phase) return;
      const wasRunning = ride.phase === 'running';
      ride.phase = phase ?? 'waiting';
      if (phase === 'running') {
        ride.firstDepartureMs ??= timeMs;
        ride.correction = store.get(manualStationCorrectionAtom);
        if (
          store.set(showImuDepartureAtom, {
            leg,
            originGroupId: origin.groupId,
            stations,
            direction,
            bound,
          })
        )
          displayedLeg.current = leg;
      } else if (phase === 'stop' && wasRunning) {
        if (ride.correction !== store.get(manualStationCorrectionAtom)) return;
        if (
          ride.firstDepartureMs != null &&
          leg.etaSeconds != null &&
          hasReachedImuArrivalTime(
            leg.etaSeconds,
            (timeMs - ride.firstDepartureMs) / 1000
          ) &&
          store.set(applyImuArrivalAtom, context)
        ) {
          // Keep the 24-second sensor history and restart guard across the station change.
          session.current = {
            ...ride,
            station: target,
            target: null,
            firstDepartureMs: null,
            distanceInterrupted: false,
          };
        }
      } else if (phase == null) {
        ride.firstDepartureMs = null;
        if (displayedLeg.current)
          store.set(clearImuDepartureAtom, displayedLeg.current);
        displayedLeg.current = null;
      }
    };
    if (shadow) {
      const applyRecordedPhase = () => {
        const change = store.get(recordedRidePhaseAtom);
        applyPhase(change?.phase ?? null, change?.timeMs ?? 0);
      };
      applyRecordedPhase();
      return store.sub(recordedRidePhaseAtom, applyRecordedPhase);
    }

    let disposed = false;
    let started = false;
    let subscription: { remove(): void } | undefined;
    const start = async () => {
      if (started || (!store.get(arrivedAtom) && ride.timeMs == null)) return;
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
        if (!store.get(arrivedAtom) && ride.timeMs == null) {
          started = false;
          return;
        }
        let estimator =
          leg.distanceM && !ride.distanceInterrupted
            ? new ImuShadowEstimator(leg)
            : null;
        const { ImuStopTrial: Trial } =
          require('~/lib/imuStopTrial') as typeof import('~/lib/imuStopTrial');
        ride.trial ??= new Trial();
        sensor.setUpdateInterval(100);
        subscription = sensor.addListener((data) => {
          if (
            disposed ||
            session.current !== ride ||
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
            (ride.timeMs != null && sample.timeMs <= ride.timeMs)
          )
            return;
          if (
            ride.timeMs != null &&
            sample.timeMs - ride.timeMs > MAX_GAP_SECONDS * 1000
          ) {
            // Lost distance cannot be recovered mid-leg. The stop trial can start over.
            estimator = null;
            ride.distanceInterrupted = true;
            ride.trial = new Trial();
            ride.phase = 'waiting';
            ride.firstDepartureMs = null;
          }
          ride.timeMs = sample.timeMs;
          const decision = ride.trial?.step(sample);
          if (decision) applyPhase(decision.guardedRestart, decision.timeMs);
          if (
            session.current === ride &&
            estimator?.step(sample, performance.now()).arrivalCandidate &&
            store.set(applyImuArrivalAtom, context)
          )
            session.current = null;
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
    shadow,
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
