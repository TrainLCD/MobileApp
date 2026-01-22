import * as Application from 'expo-application';
import { useAtomValue, useSetAtom } from 'jotai';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useDistanceToNextStation, useNextStation } from '~/hooks';
import { useTelemetryEnabled } from '~/hooks/useTelemetryEnabled';
import { accuracyHistoryAtom, locationAtom } from '~/store/atoms/location';
import {
  initialTrainMotionState,
  motionDetectionEnabledAtom,
  stationStopDetectedAtom,
  type TrainMotionPhase,
  trainMotionAtom,
} from '~/store/atoms/trainMotion';
import { generateAccuracyChart } from '~/utils/accuracyChart';
import Typography from './Typography';

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 9999,
    padding: 4,
  },
  text: {
    color: 'white',
    fontSize: 11,
  },
  textHeading: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 11,
  },
  sectionHeading: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 10,
    marginTop: 4,
  },
});

// フェーズごとの色
const phaseColors: Record<TrainMotionPhase, string> = {
  unknown: '#888888',
  stopped: '#ff4444',
  accelerating: '#44ff44',
  cruising: '#4444ff',
  decelerating: '#ffaa00',
};

// フェーズの短縮表示
const phaseLabels: Record<TrainMotionPhase, string> = {
  unknown: '不明',
  stopped: '停車',
  accelerating: '加速',
  cruising: '走行',
  decelerating: '減速',
};

const DevOverlay: React.FC = () => {
  const location = useAtomValue(locationAtom);
  const speed = location?.coords?.speed;
  const accuracy = location?.coords?.accuracy;
  const accuracyHistory = useAtomValue(accuracyHistoryAtom);
  const distanceToNextStation = useDistanceToNextStation();
  const nextStation = useNextStation();
  const isTelemetryEnabled = useTelemetryEnabled();

  // モーション検出状態（nullの場合は初期状態を使用）
  const motionStateRaw = useAtomValue(trainMotionAtom);
  const motionState = motionStateRaw ?? initialTrainMotionState;
  const stationStopCount = useAtomValue(stationStopDetectedAtom) ?? 0;
  const setMotionEnabled = useSetAtom(motionDetectionEnabledAtom);

  const handleMotionToggle = useCallback(() => {
    setMotionEnabled(!motionState.isEnabled);
  }, [motionState.isEnabled, setMotionEnabled]);

  const coordsSpeed = ((speed ?? 0) < 0 ? 0 : speed) ?? 0;

  const speedKMH = useMemo(
    () =>
      (
        (speed && Math.round((coordsSpeed * 3600) / 1000)) ??
        0
      ).toLocaleString(),
    [coordsSpeed, speed]
  );

  const accuracyChartBlocks = useMemo(
    () => generateAccuracyChart(accuracyHistory),
    [accuracyHistory]
  );

  // 経過秒数を毎秒更新するためのtick state
  const [phaseDuration, setPhaseDuration] = useState(0);

  useEffect(() => {
    if (!motionState.isEnabled || motionState.phaseStartTime === 0) {
      setPhaseDuration(0);
      return;
    }

    setPhaseDuration(
      Math.round((Date.now() - motionState.phaseStartTime) / 1000)
    );

    const intervalId = setInterval(() => {
      setPhaseDuration(
        Math.round((Date.now() - motionState.phaseStartTime) / 1000)
      );
    }, 1000);

    return () => clearInterval(intervalId);
  }, [motionState.isEnabled, motionState.phaseStartTime]);

  const dim = useWindowDimensions();

  return (
    <View style={[styles.root, { width: dim.width / 4 }]}>
      <Typography style={styles.textHeading}>
        TrainLCD DO
        {` ${Application.nativeApplicationVersion}(${Application.nativeBuildVersion})`}
      </Typography>
      <Typography style={styles.text}>
        {accuracyChartBlocks.map((block, index) => (
          <Text
            key={`${index}-${block.char}-${block.color}`}
            style={{ color: block.color }}
          >
            {block.char}
          </Text>
        ))}
      </Typography>
      <Typography style={styles.text}>{`Accuracy: ${
        accuracy ?? ''
      }m`}</Typography>
      {distanceToNextStation ? (
        <Typography style={styles.text}>
          Next: {distanceToNextStation}m
          {nextStation?.name && ` ${nextStation.name}`}
        </Typography>
      ) : (
        <Typography style={styles.text}>Next:</Typography>
      )}
      <Typography style={styles.text}>
        Speed: {speedKMH}
        km/h
      </Typography>
      <Typography style={styles.text}>
        Telemetry: {isTelemetryEnabled ? 'ON' : 'OFF'}
      </Typography>

      {/* モーション検出セクション（タップでトグル） */}
      <Pressable onPress={handleMotionToggle}>
        <Typography style={styles.sectionHeading}>Motion (tap)</Typography>
        {motionState.isEnabled ? (
          <>
            <Typography style={styles.text}>
              Phase:{' '}
              <Text style={{ color: phaseColors[motionState.phase] }}>
                {phaseLabels[motionState.phase]}
              </Text>
              {` ${phaseDuration}s`}
            </Typography>
            <Typography style={styles.text}>
              Accel: {motionState.currentAcceleration.toFixed(3)} m/s²
            </Typography>
            <Typography style={styles.text}>
              Stops: {motionState.stopCount} (Total: {stationStopCount})
            </Typography>
          </>
        ) : (
          <Typography style={styles.text}>OFF (GPS mode)</Typography>
        )}
      </Pressable>
    </View>
  );
};

export default React.memo(DevOverlay);
