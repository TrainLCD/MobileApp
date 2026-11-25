import { useIsFocused } from '@react-navigation/native';
import * as Application from 'expo-application';
import * as Battery from 'expo-battery';
import { useAtomValue, useStore } from 'jotai';
import { useEffect, useRef, useState } from 'react';
import { AppState, Platform, Pressable, StyleSheet, View } from 'react-native';
import Typography from '~/components/Typography';
import { useEstimateArrivalTimesRoute } from '~/hooks/useEstimateArrivalTimesRoute';
import {
  buildLeg,
  type Estimate,
  ImuShadowEstimator,
  type MotionSample,
  type RouteStop,
} from '~/lib/imuShadow';
import {
  getLastImuShadowRecording,
  type Mode,
  type Recording,
  rememberImuShadowRecording,
} from '~/lib/imuShadowRecording';
import { getTrackDistance } from '~/lib/trackDistances';
import { etaAnchorAtom } from '~/store/atoms/etaFallback';
import { locationAtom, rawLocationAtom } from '~/store/atoms/location';
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
  const { route } = useEstimateArrivalTimesRoute({ skip: autoMode });
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
  const [hasDeparture, setHasDeparture] = useState(false);
  const [actualArrivalAt, setActualArrivalAt] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(0);
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
    return {
      stationId: store.get(stationAtom)?.id ?? null,
      arrived: store.get(arrivedAtom),
      rawLocationTimeMs: raw?.timestamp ?? null,
      rawAccuracyM: raw?.coords.accuracy ?? null,
      rawSpeedMps: raw?.coords.speed ?? null,
      filteredLocationTimeMs: store.get(locationAtom)?.timestamp ?? null,
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
      recording.observations.push({
        atMs: recording.endedAtMs,
        legIndex: recording.legs.length - 1,
        estimate: estimatorRef.current?.snapshot() ?? null,
        reference: readReference(recording.endedAtMs),
      });
      void recordBattery(recording);
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
  const currentId = store.get(stationAtom)?.id;
  const matches = availableStarts.filter(
    (index) => stops[index]?.stationId === currentId
  );
  const selected =
    startIndex != null && availableStarts.includes(startIndex)
      ? startIndex
      : matches.length === 1
        ? matches[0]
        : availableStarts[0];
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
      recording.mode === 'imu' ? new ImuShadowEstimator(result.leg) : null;
    lastCandidateRef.current = false;
    setHasDeparture(false);
    setActualArrivalAt(null);
    setEstimate(estimatorRef.current?.snapshot() ?? null);
    setDisplayLeg(result.leg);
    return true;
  };

  const recordEvent = (
    recording: Recording,
    kind: Recording['events'][number]['kind'],
    stationId: number,
    atMs: number,
    value: Estimate | null
  ) => {
    recording.events.push({
      atMs,
      legIndex: recording.legs.length - 1,
      kind,
      stationId,
      estimate: value,
      reference: readReference(atMs),
    });
  };

  const start = async (mode: Mode) => {
    if (
      selected == null ||
      running ||
      starting ||
      !focused ||
      autoMode ||
      AppState.currentState !== 'active'
    ) {
      return;
    }
    setStarting(true);
    const generation = ++generationRef.current;
    activeRouteKeyRef.current = routeKey;
    try {
      // Do not resolve the native module on existing JS-only builds unless explicitly requested.
      const sensor =
        mode === 'imu' ? (await import('expo-sensors')).DeviceMotion : null;
      if (sensor) {
        if (!(await sensor.isAvailableAsync())) {
          throw new Error('sensor-unavailable');
        }
        if (!(await sensor.requestPermissionsAsync()).granted) {
          throw new Error('sensor-permission-denied');
        }
      }
      if (generation !== generationRef.current) {
        return;
      }
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
      if (!initializeLeg(recording, selected)) {
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
        const value = estimatorRef.current?.snapshot() ?? null;
        recording.observations.push({
          atMs,
          legIndex: recording.legs.length - 1,
          estimate: value,
          reference: readReference(atMs),
        });
        setEstimate(value);
        setNowMs(atMs);
        if (atMs - lastBatteryAt >= 30_000) {
          lastBatteryAt = atMs;
          void recordBattery(recording);
        }
        if (atMs - recording.startedAtMs >= MAX_DURATION_MS) {
          stopRef.current('recording-limit');
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
          const sample: MotionSample = {
            timeMs: performance.now(),
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
          const estimator = estimatorRef.current;
          if (!estimator) {
            return;
          }
          const value = estimator.step(sample);
          if (value.arrivalCandidate !== lastCandidateRef.current) {
            lastCandidateRef.current = value.arrivalCandidate;
            recordEvent(
              recording,
              value.arrivalCandidate ? 'candidate' : 'candidate-lost',
              estimator.leg.toId,
              atMs,
              value
            );
          }
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

  const markDeparture = () => {
    const recording = recordingRef.current;
    const leg = recording?.legs.at(-1)?.leg;
    if (
      !recording ||
      !leg ||
      recording.events.some(
        (event) =>
          event.legIndex === recording.legs.length - 1 &&
          event.kind === 'departure'
      )
    ) {
      return;
    }
    recordEvent(
      recording,
      'departure',
      leg.fromId,
      Date.now(),
      estimatorRef.current?.snapshot() ?? null
    );
    setHasDeparture(true);
  };
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
    recordEvent(
      recording,
      'arrival',
      leg.toId,
      atMs,
      estimatorRef.current?.snapshot() ?? null
    );
    setActualArrivalAt(atMs);
  };
  const nextLeg = () => {
    const recording = recordingRef.current;
    if (
      !recording ||
      actualArrivalAt == null ||
      Date.now() - actualArrivalAt < 3000
    ) {
      return;
    }
    if (!initializeLeg(recording, nextIndexRef.current)) {
      stopRef.current('terminal');
    }
  };
  const exportRecording = async () => {
    try {
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
            text={label('記録停止', 'Stop')}
            onPress={() => stop('manual-stop')}
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
              <View style={styles.buttons}>
                <Action
                  text={label('実発車', 'Actual departure')}
                  onPress={markDeparture}
                  disabled={hasDeparture || actualArrivalAt != null}
                />
                <Action
                  text={label('次駅に実到着', 'Actual next arrival')}
                  onPress={markArrival}
                  disabled={actualArrivalAt != null}
                />
                {actualArrivalAt != null && (
                  <Action
                    text={label('次区間を開始', 'Next leg')}
                    onPress={nextLeg}
                    disabled={nowMs - actualArrivalAt < 3000}
                  />
                )}
              </View>
            </>
          )}
          {!!message && <Typography style={styles.text}>{message}</Typography>}
          <Action
            text={label('JSON書き出し', 'Export JSON')}
            disabled={running || starting || !getLastImuShadowRecording()}
            onPress={() => {
              void exportRecording();
            }}
          />
        </>
      )}
    </View>
  );
};
