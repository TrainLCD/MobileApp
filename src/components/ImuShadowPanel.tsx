import { useIsFocused } from '@react-navigation/native';
import * as Application from 'expo-application';
import * as Battery from 'expo-battery';
import { useAtomValue, useStore } from 'jotai';
import { useEffect, useRef, useState } from 'react';
import { AppState, Platform, Pressable, StyleSheet, View } from 'react-native';
import Typography from '~/components/Typography';
import { useEstimateArrivalTimesRoute } from '~/hooks/useEstimateArrivalTimesRoute';
import { useThreshold } from '~/hooks/useThreshold';
import {
  buildLeg,
  type Estimate,
  getMotionSampleTimeMs,
  ImuShadowEstimator,
  type MotionSample,
  type RouteStop,
} from '~/lib/imuShadow';
import {
  getLastImuShadowRecording,
  getLocationArrivalStationId,
  isManualCorrectionActive,
  type Mode,
  type Recording,
  rememberFinalBatteryObservation,
  rememberImuShadowRecording,
} from '~/lib/imuShadowRecording';
import { loadImuShadowSensor } from '~/lib/imuShadowSensor';
import { getTrackDistance } from '~/lib/trackDistances';
import { etaAnchorAtom } from '~/store/atoms/etaFallback';
import { locationAtom, rawLocationAtom } from '~/store/atoms/location';
import { manualStationCorrectionAtom } from '~/store/atoms/manualStationCorrection';
import { autoModeEnabledAtom } from '~/store/atoms/navigation';
import {
  arrivedAtom,
  selectedBoundAtom,
  selectedDirectionAtom,
  stationAtom,
  stationsAtom,
} from '~/store/atoms/station';
import { isJapanese } from '~/translation';
import { getEtaPhaseNow } from '~/utils/etaPhaseNow';
import { exportImuShadow } from '~/utils/exportImuShadow';

type Subscription = { remove(): void };
const MAX_DURATION_MS = 30 * 60 * 1000;
const MAX_MOTION_SAMPLES = 20_000;
const label = (ja: string, en: string) => (isJapanese ? ja : en);

const styles = StyleSheet.create({
  root: {
    alignSelf: 'stretch',
    backgroundColor: 'rgba(9, 14, 28, 0.7)',
    borderColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 8,
    gap: 5,
  },
  text: { color: '#FFFFFF', fontSize: 11 },
  metricLabel: { color: 'rgba(199, 210, 254, 0.72)', fontSize: 9 },
  metricValue: { color: '#f8fafc', fontSize: 15, fontWeight: '700' },
  metrics: { flexDirection: 'row', gap: 8 },
  metric: { flex: 1, gap: 3 },
  button: { backgroundColor: '#364657', borderRadius: 4, padding: 6 },
  disabled: { opacity: 0.4 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
});

const Action = ({
  text,
  onPress,
  disabled = false,
}: {
  text: string;
  onPress: () => void;
  disabled?: boolean;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ disabled }}
    disabled={disabled}
    onPress={onPress}
    style={[styles.button, disabled && styles.disabled]}
  >
    <Typography style={styles.text}>{text}</Typography>
  </Pressable>
);

/** Only mounted in opt-in developer builds. Nothing in this panel drives navigation. */
export const ImuShadowPanel = () => {
  const store = useStore();
  const focused = useIsFocused();
  const autoMode = useAtomValue(autoModeEnabledAtom);
  const bound = useAtomValue(selectedBoundAtom);
  const direction = useAtomValue(selectedDirectionAtom);
  const stations = useAtomValue(stationsAtom);
  const currentStation = useAtomValue(stationAtom);
  const arrived = useAtomValue(arrivedAtom);
  const [foreground, setForeground] = useState(
    AppState.currentState === 'active'
  );
  const { route } = useEstimateArrivalTimesRoute({ skip: autoMode });
  const { arrivedThreshold } = useThreshold();
  const arrivedThresholdRef = useRef(arrivedThreshold);
  useEffect(() => {
    arrivedThresholdRef.current = arrivedThreshold;
  }, [arrivedThreshold]);
  const stops: readonly RouteStop[] = route?.stops ?? [];
  const routeKey = JSON.stringify([bound?.id, direction, route?.id, stops]);
  const [startIndex, setStartIndex] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [message, setMessage] = useState('');
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [displayLeg, setDisplayLeg] = useState<
    Recording['legs'][number]['leg'] | null
  >(null);
  const [collapsed, setCollapsed] = useState(false);
  const [arrivalMarked, setArrivalMarked] = useState(false);
  const arrivalMarkedAtRef = useRef<number | null>(null);
  const departureRecordedRef = useRef(false);
  const [autoAttempted, setAutoAttempted] = useState(false);
  const recordingRef = useRef<Recording | null>(null);
  const estimatorRef = useRef<ImuShadowEstimator | null>(null);
  const subscriptionRef = useRef<Subscription | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCandidateRef = useRef(false);
  const generationRef = useRef(0);
  const nextIndexRef = useRef(-1);
  const activeRouteKeyRef = useRef<string | null>(null);

  const readReference = (atMs: number) => {
    const raw = store.get(rawLocationAtom);
    const filtered = store.get(locationAtom);
    const station = store.get(stationAtom);
    const arrived = store.get(arrivedAtom);
    const legStartedAtMs = recordingRef.current?.legs.at(-1)?.startedAtMs;
    return {
      stationId: station?.id ?? null,
      arrived,
      locationArrivalStationId:
        legStartedAtMs == null
          ? null
          : getLocationArrivalStationId({
              raw,
              filtered,
              station,
              arrived,
              manualCorrection: isManualCorrectionActive(
                store.get(manualStationCorrectionAtom),
                filtered,
                store.get(stationsAtom)
              ),
              arrivedThreshold: arrivedThresholdRef.current,
              atMs,
              legStartedAtMs,
            }),
      rawLocationTimeMs: raw?.timestamp ?? null,
      rawAccuracyM: raw?.coords.accuracy ?? null,
      rawSpeedMps: raw?.coords.speed ?? null,
      filteredLocationTimeMs: filtered?.timestamp ?? null,
      etaPhase: getEtaPhaseNow(atMs),
      etaAnchor: store.get(etaAnchorAtom),
    };
  };

  const recordBattery = async (recording: Recording) => {
    const atMs = Date.now();
    try {
      const [level, state] = await Promise.all([
        Battery.getBatteryLevelAsync(),
        Battery.getBatteryStateAsync(),
      ]);
      recording.battery.push({ atMs, level: level >= 0 ? level : null, state });
    } catch {
      recording.battery.push({ atMs, level: null, state: null });
    }
  };

  const stopRef = useRef<(reason: string, updateUi?: boolean) => void>(
    () => {}
  );
  // The subscription, timer and AppState callback always use the current stop implementation.
  const stop = (reason: string, updateUi = true) => {
    generationRef.current += 1;
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
    if (intervalRef.current != null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    const recording = recordingRef.current;
    if (recording && recording.endedAtMs == null) {
      recording.endedAtMs = Date.now();
      recording.endReason = reason;
      // Take a last observation even if the run is interrupted before the next periodic tick.
      const finalEstimate = readEstimate(recording, recording.endedAtMs);
      recording.observations.push({
        atMs: recording.endedAtMs,
        legIndex: recording.legs.length - 1,
        estimate: finalEstimate,
        reference: readReference(recording.endedAtMs),
      });
      if (updateUi) {
        setEstimate(finalEstimate);
      }
      rememberFinalBatteryObservation(recording, recordBattery(recording));
    }
    recordingRef.current = null;
    estimatorRef.current = null;
    activeRouteKeyRef.current = null;
    if (updateUi) {
      setRunning(false);
      setStarting(false);
      setMessage(reason);
    }
  };

  useEffect(() => {
    stopRef.current = stop;
  });

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setForeground(state === 'active');
      if (state !== 'active' && recordingRef.current) {
        stopRef.current('foreground-ended');
      }
      if (state === 'background' && !recordingRef.current) {
        // Cancel an in-flight permission/start operation on an actual background transition.
        stopRef.current('foreground-ended');
      }
    });
    return () => {
      subscription.remove();
      stopRef.current('screen-closed', false);
    };
  }, []);

  useEffect(() => {
    if (
      activeRouteKeyRef.current != null &&
      (!focused || autoMode || activeRouteKeyRef.current !== routeKey)
    ) {
      stopRef.current('route-changed');
    }
    setStartIndex(null);
  }, [routeKey, autoMode, focused]);

  const physicalStops = stops.flatMap((s, index) => {
    const prev = stops[index - 1];
    if (
      s.stopsHere !== true ||
      s.stationId == null ||
      (prev?.stopsHere === true &&
        (s.stationId === prev.stationId ||
          (s.stationGroupId != null &&
            s.stationGroupId === prev.stationGroupId)))
    ) {
      return [];
    }
    return [index];
  });
  const availableStarts = physicalStops.slice(0, -1);
  // The current station may use the outgoing line's ID at a junction.
  // Only a unique matching physical stop can start an automatic recording.
  const findAutoStartIndex = (station: typeof currentStation) => {
    const matches = availableStarts.filter((index) => {
      const stop = stops[index];
      return (
        stop.stationId === station?.id ||
        (stop.stationGroupId != null &&
          stop.stationGroupId === station?.groupId)
      );
    });
    return matches.length === 1 ? matches[0] : null;
  };
  const autoStartIndex = findAutoStartIndex(currentStation);
  const selected =
    startIndex != null && availableStarts.includes(startIndex)
      ? startIndex
      : (autoStartIndex ?? availableStarts[0]);
  const selectedPosition =
    selected == null ? -1 : availableStarts.indexOf(selected);
  const stationLabel = (id: number | null | undefined): string => {
    if (id == null) {
      return '?';
    }
    const station = stations.find((s) => s.id === id);
    return `${(isJapanese ? station?.name : station?.nameRoman) ?? ''} #${id}`.trim();
  };

  const initializeLeg = (recording: Recording, index: number): boolean => {
    const result = buildLeg(recording.stops, index, getTrackDistance);
    if (!result) {
      return false;
    }
    recording.legs.push({ startedAtMs: Date.now(), leg: result.leg });
    nextIndexRef.current = result.nextIndex;
    estimatorRef.current =
      recording.mode === 'imu'
        ? new ImuShadowEstimator(result.leg, performance.now())
        : null;
    lastCandidateRef.current = false;
    departureRecordedRef.current = false;
    arrivalMarkedAtRef.current = null;
    setArrivalMarked(false);
    setEstimate(estimatorRef.current?.snapshot() ?? null);
    setDisplayLeg(result.leg);
    return true;
  };

  const recordEvent = (
    recording: Recording,
    kind: Recording['events'][number]['kind'],
    stationId: number,
    atMs: number,
    value: Estimate | null,
    departureSource?: 'imu' | 'location'
  ) => {
    recording.events.push({
      atMs,
      legIndex: recording.legs.length - 1,
      kind,
      stationId,
      estimate: value,
      ...(departureSource ? { departureSource } : {}),
      reference: readReference(atMs),
    });
  };

  const recordCandidateChange = (
    recording: Recording,
    atMs: number,
    value: Estimate
  ) => {
    const estimator = estimatorRef.current;
    if (estimator && value.arrivalCandidate !== lastCandidateRef.current) {
      lastCandidateRef.current = value.arrivalCandidate;
      recordEvent(
        recording,
        value.arrivalCandidate ? 'candidate' : 'candidate-lost',
        estimator.leg.toId,
        atMs,
        value
      );
    }
  };

  const readEstimate = (
    recording: Recording,
    atMs: number,
    periodic = false
  ): Estimate | null => {
    const estimator = estimatorRef.current;
    if (!estimator) return null;
    const receiptTime = performance.now();
    const value = periodic
      ? estimator.snapshotForPeriodicObservation(receiptTime)
      : estimator.snapshotAtReceiptTime(receiptTime);
    // A provisional stale snapshot is not a new estimator candidate transition.
    recordCandidateChange(recording, atMs, estimator.snapshot());
    return value;
  };

  const recordDeparture = (
    recording: Recording,
    atMs: number,
    value: Estimate | null
  ) => {
    const currentLeg = recording.legs.at(-1);
    if (
      !currentLeg ||
      departureRecordedRef.current ||
      arrivalMarkedAtRef.current != null
    )
      return;
    const { leg, startedAtMs } = currentLeg;
    const anchor = store.get(etaAnchorAtom);
    const origin = recording.stops.find(
      (stop) => stop.stationId === leg.fromId
    );
    const anchorStop = recording.stops.find(
      (stop) => stop.stationId === anchor?.stationId
    );
    // ETA's location-based departure anchor is available in baseline mode too.
    const locationDeparture =
      anchor?.kind === 'DEPARTED' &&
      anchor.observedAtMs >= startedAtMs &&
      anchor.observedAtMs <= atMs &&
      (anchor.stationId === leg.fromId ||
        (origin?.stationGroupId != null &&
          origin.stationGroupId === anchorStop?.stationGroupId))
        ? anchor.observedAtMs
        : null;
    const imuDeparture =
      value != null && value.phase !== 'invalid' && value.elapsedSeconds != null
        ? Math.max(startedAtMs, atMs - value.elapsedSeconds * 1000)
        : null;
    const departureAtMs = locationDeparture ?? imuDeparture;
    if (departureAtMs == null) return;
    departureRecordedRef.current = true;
    recordEvent(
      recording,
      'departure',
      leg.fromId,
      departureAtMs,
      value,
      locationDeparture != null ? 'location' : 'imu'
    );
  };

  const start = async (mode: Mode, index = selected, automatic = false) => {
    if (
      index == null ||
      recordingRef.current != null ||
      activeRouteKeyRef.current != null ||
      !focused ||
      autoMode ||
      AppState.currentState !== 'active'
    ) {
      return;
    }
    setAutoAttempted(true);
    setStarting(true);
    const generation = ++generationRef.current;
    activeRouteKeyRef.current = routeKey;
    // Each asynchronous prerequisite can outlive the stop at which it began.
    // Read the store directly, not the snapshot captured by the render.
    const stillEligible = () => {
      if (generation !== generationRef.current) return false;
      if (
        automatic &&
        (!store.get(arrivedAtom) ||
          findAutoStartIndex(store.get(stationAtom)) !== index ||
          store.get(selectedBoundAtom)?.id !== bound?.id ||
          store.get(selectedDirectionAtom) !== direction ||
          store.get(autoModeEnabledAtom))
      ) {
        stopRef.current('station-changed');
        // Re-evaluate even if the new station rendered while this attempt was pending.
        setAutoAttempted(false);
        return false;
      }
      return true;
    };
    try {
      // Do not resolve the native module on existing JS-only builds unless explicitly requested.
      const sensor = mode === 'imu' ? await loadImuShadowSensor() : null;
      if (!stillEligible()) return;
      if (sensor) {
        const available = await sensor.isAvailableAsync();
        if (!stillEligible()) return;
        if (!available) {
          throw new Error('sensor-unavailable');
        }
        const permission = await sensor.requestPermissionsAsync();
        if (!stillEligible()) return;
        if (!permission.granted) {
          throw new Error('sensor-permission-denied');
        }
      }
      if (!stillEligible()) return;
      if (AppState.currentState !== 'active') {
        throw new Error('foreground-required');
      }
      const recording: Recording = {
        schemaVersion: 1,
        mode,
        appVersion: Application.nativeApplicationVersion,
        buildNumber: Application.nativeBuildVersion,
        platform: Platform.OS,
        osVersion: Platform.Version,
        startedAtMs: Date.now(),
        endedAtMs: null,
        endReason: null,
        stops: [...stops],
        legs: [],
        motion: [],
        observations: [],
        events: [],
        battery: [],
      };
      if (!initializeLeg(recording, index)) {
        throw new Error('route-unavailable');
      }
      recordingRef.current = recording;
      rememberImuShadowRecording(recording);
      void recordBattery(recording);
      let lastBatteryAt = recording.startedAtMs;
      const tick = () => {
        if (recordingRef.current !== recording) {
          return;
        }
        const atMs = Date.now();
        const value = readEstimate(recording, atMs, true);
        recordDeparture(recording, atMs, value);
        recording.observations.push({
          atMs,
          legIndex: recording.legs.length - 1,
          estimate: value,
          reference: readReference(atMs),
        });
        setEstimate(value);
        if (atMs - lastBatteryAt >= 30_000) {
          lastBatteryAt = atMs;
          void recordBattery(recording);
        }
        if (atMs - recording.startedAtMs >= MAX_DURATION_MS) {
          stopRef.current('recording-limit');
          return;
        }
        // Keep the arrival observation window of the previous leg, then advance
        // from the independent user label, never from an IMU/ETA candidate.
        const markedAt = arrivalMarkedAtRef.current;
        if (markedAt != null && atMs - markedAt >= 3000) {
          if (!initializeLeg(recording, nextIndexRef.current)) {
            stopRef.current('terminal');
          }
        }
      };
      intervalRef.current = setInterval(tick, 1000);
      tick();
      if (sensor) {
        sensor.setUpdateInterval(100);
        subscriptionRef.current = sensor.addListener((data) => {
          if (
            recordingRef.current !== recording ||
            AppState.currentState !== 'active'
          ) {
            return;
          }
          if (recording.motion.length >= MAX_MOTION_SAMPLES) {
            stopRef.current('sample-limit');
            return;
          }
          const atMs = Date.now();
          const receivedAtMs = performance.now();
          const estimator = estimatorRef.current;
          if (!estimator) return;
          // Android exposes per-sensor timestamps and may reuse the same acceleration event.
          // Use the gravity-free acceleration timestamp on both platforms, never JS receipt time.
          const timeMs = getMotionSampleTimeMs(data.acceleration?.timestamp);
          if (timeMs == null || !data.accelerationIncludingGravity) {
            const value = estimator.invalidate(
              !data.acceleration || !data.accelerationIncludingGravity
                ? 'missing-motion'
                : 'invalid-time'
            );
            recordCandidateChange(recording, atMs, value);
            return;
          }
          const sample: MotionSample = {
            timeMs,
            acceleration: data.acceleration,
            accelerationIncludingGravity: data.accelerationIncludingGravity,
            rotationDegPerSecond:
              data.rotationRate == null
                ? null
                : Math.hypot(
                    data.rotationRate.alpha,
                    data.rotationRate.beta,
                    data.rotationRate.gamma
                  ),
            rotation: data.rotation,
          };
          recording.motion.push({
            observedAtMs: atMs,
            legIndex: recording.legs.length - 1,
            sample,
          });
          const value = estimator.step(sample, receivedAtMs);
          recordDeparture(recording, atMs, value);
          recordCandidateChange(recording, atMs, value);
        });
      }
      setRunning(true);
      setStarting(false);
      setMessage('');
    } catch (error) {
      if (generation === generationRef.current) {
        stopRef.current(
          error instanceof Error ? error.message : 'start-failed'
        );
      }
    }
  };

  // Mounting the opt-in panel in an eligible ride starts once, without opening DO.
  // Explicit stop/export or a failed permission request must not immediately start again.
  const startRef = useRef(start);
  useEffect(() => {
    startRef.current = start;
  });
  useEffect(() => {
    if (
      !autoAttempted &&
      focused &&
      foreground &&
      !autoMode &&
      arrived &&
      autoStartIndex != null &&
      bound != null &&
      direction != null
    ) {
      void startRef.current('imu', autoStartIndex, true);
    }
  }, [
    focused,
    foreground,
    autoMode,
    arrived,
    autoStartIndex,
    bound,
    direction,
    autoAttempted,
  ]);

  const markArrival = () => {
    const recording = recordingRef.current;
    const leg = recording?.legs.at(-1)?.leg;
    if (
      !recording ||
      !leg ||
      recording.events.some(
        (event) =>
          event.legIndex === recording.legs.length - 1 &&
          event.kind === 'arrival'
      )
    ) {
      return;
    }
    const atMs = Date.now();
    const value = readEstimate(recording, atMs);
    recordDeparture(recording, atMs, value);
    recordEvent(recording, 'arrival', leg.toId, atMs, value);
    arrivalMarkedAtRef.current = atMs;
    setArrivalMarked(true);
  };
  const exportRecording = async () => {
    try {
      if (recordingRef.current) stop('manual-stop');
      await exportImuShadow();
    } catch {
      setMessage('export-failed');
    }
  };

  return (
    <View style={styles.root} testID="dev-overlay-imu-shadow">
      <View style={styles.buttons}>
        <Action
          text={collapsed ? 'IMU SHADOW +' : 'IMU SHADOW −'}
          onPress={() => setCollapsed((prev) => !prev)}
        />
        {running && (
          <Action
            text={label('終了・JSON出力', 'Finish & export')}
            onPress={() => {
              void exportRecording();
            }}
          />
        )}
      </View>
      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Typography style={styles.metricLabel}>IMU POSITION</Typography>
          <Typography style={styles.metricValue}>
            {estimate ? `${estimate.distanceM.toFixed(0)} m` : '--'}
          </Typography>
          <Typography style={styles.text}>
            {estimate ? `± ${estimate.sigmaM.toFixed(0)} m` : '--'}
          </Typography>
        </View>
        <View style={styles.metric}>
          <Typography style={styles.metricLabel}>IMU STATE</Typography>
          <Typography style={styles.metricValue}>
            {estimate
              ? estimate.phase.toUpperCase()
              : running
                ? 'BASELINE'
                : 'IDLE'}
          </Typography>
          <Typography style={styles.text}>
            {estimate
              ? `${(estimate.speedMps * 3.6).toFixed(1)} km/h · ${estimate.arrivalCandidate ? 'ARRIVAL?' : 'NO'}`
              : '--'}
          </Typography>
        </View>
      </View>
      {running && displayLeg && (
        <Action
          text={
            arrivalMarked
              ? label('次区間へ移行中', 'Advancing to next leg')
              : label('次駅に実到着', 'Actual next arrival')
          }
          onPress={markArrival}
          disabled={arrivalMarked}
        />
      )}
      {!collapsed && (
        <>
          <Typography style={styles.text}>
            {label(
              '実験・本番判定には反映しません',
              'Experiment only; does not drive arrival'
            )}
          </Typography>
          {autoMode && (
            <Typography style={styles.text}>
              {label('オートモード中は利用不可', 'Unavailable in auto mode')}
            </Typography>
          )}
          {!running && (
            <>
              <Typography style={styles.text}>
                {starting
                  ? label('記録準備中', 'Preparing recording')
                  : label(
                      '停車駅を特定できると自動記録します。手動でも開始できます。',
                      'Records automatically at a known stopped station; manual start is also available.'
                    )}
              </Typography>
              <Typography style={styles.text}>
                {label('実際の停車駅を選択:', 'Select actual stopped station:')}{' '}
                {stationLabel(
                  selected == null ? null : stops[selected]?.stationId
                )}
              </Typography>
              <View style={styles.buttons}>
                <Action
                  text="‹"
                  disabled={starting || selectedPosition <= 0}
                  onPress={() =>
                    setStartIndex(availableStarts[selectedPosition - 1])
                  }
                />
                <Action
                  text="›"
                  disabled={
                    starting ||
                    selectedPosition < 0 ||
                    selectedPosition >= availableStarts.length - 1
                  }
                  onPress={() =>
                    setStartIndex(availableStarts[selectedPosition + 1])
                  }
                />
                <Action
                  text={label('IMU記録', 'Record IMU')}
                  disabled={starting || selected == null || autoMode}
                  onPress={() => {
                    void start('imu');
                  }}
                />
                <Action
                  text={label('比較記録', 'Baseline')}
                  disabled={starting || selected == null || autoMode}
                  onPress={() => {
                    void start('baseline');
                  }}
                />
              </View>
            </>
          )}
          {running && displayLeg && (
            <>
              <Typography style={styles.text}>
                {stationLabel(displayLeg.fromId)} →{' '}
                {stationLabel(displayLeg.toId)}
              </Typography>
              <Typography
                style={styles.text}
              >{`Track: ${displayLeg.distanceM ?? '?'} m / ETA: ${displayLeg.etaSeconds ?? '?'} s`}</Typography>
              {estimate?.reason && (
                <Typography style={styles.text}>{estimate.reason}</Typography>
              )}
            </>
          )}
          {!!message && <Typography style={styles.text}>{message}</Typography>}
          {!running && (
            <Action
              text={label('JSON書き出し', 'Export JSON')}
              disabled={starting || !getLastImuShadowRecording()}
              onPress={() => {
                void exportRecording();
              }}
            />
          )}
        </>
      )}
    </View>
  );
};
