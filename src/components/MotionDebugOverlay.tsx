import { useAtomValue } from 'jotai';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { POOR_GPS_ACCURACY_THRESHOLD } from '~/constants/motion';
import { locationAtom } from '~/store/atoms/location';
import {
  stationStopDetectedAtom,
  type TrainMotionPhase,
  trainMotionAtom,
} from '~/store/atoms/trainMotion';
import Typography from './Typography';

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    bottom: 100,
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 9999,
    padding: 8,
    borderRadius: 4,
    minWidth: 150,
  },
  heading: {
    color: '#00ff00',
    fontWeight: 'bold',
    fontSize: 12,
    marginBottom: 4,
  },
  text: {
    color: 'white',
    fontSize: 11,
  },
  phaseText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  modeIndicator: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 2,
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

// フェーズの日本語表示
const phaseLabels: Record<TrainMotionPhase, string> = {
  unknown: '不明',
  stopped: '停車中',
  accelerating: '加速中',
  cruising: '走行中',
  decelerating: '減速中',
};

/**
 * 加速度センサーによる移動検出のデバッグ表示
 * PoC検証用のオーバーレイコンポーネント
 */
const MotionDebugOverlay: React.FC = () => {
  const motionState = useAtomValue(trainMotionAtom);
  const stationStopCount = useAtomValue(stationStopDetectedAtom);
  const location = useAtomValue(locationAtom);

  const gpsAccuracy = location?.coords.accuracy;
  const isGpsPoor =
    gpsAccuracy == null || gpsAccuracy >= POOR_GPS_ACCURACY_THRESHOLD;

  const confidencePercent = useMemo(
    () => Math.round(motionState.confidence * 100),
    [motionState.confidence]
  );

  const phaseDuration = useMemo(() => {
    if (motionState.phaseStartTime === 0) return 0;
    return Math.round((Date.now() - motionState.phaseStartTime) / 1000);
  }, [motionState.phaseStartTime]);

  const phaseColor = phaseColors[motionState.phase];
  const phaseLabel = phaseLabels[motionState.phase];

  if (!motionState.isEnabled) {
    return (
      <View style={styles.root}>
        <Typography style={styles.heading}>Motion Detection</Typography>
        <Typography style={styles.text}>Mode: OFF</Typography>
        <Typography style={styles.text}>
          GPS: {gpsAccuracy?.toFixed(0) ?? 'N/A'}m{' '}
          {isGpsPoor ? '(Poor)' : '(Good)'}
        </Typography>
        <View
          style={[
            styles.modeIndicator,
            { backgroundColor: isGpsPoor ? '#ff6600' : '#00aa00' },
          ]}
        >
          <Typography style={[styles.text, { fontSize: 10 }]}>
            {isGpsPoor ? 'GPS精度低下中' : 'GPSモード'}
          </Typography>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Typography style={styles.heading}>Motion Detection (PoC)</Typography>

      <View style={styles.row}>
        <View style={[styles.indicator, { backgroundColor: phaseColor }]} />
        <Typography style={[styles.phaseText, { color: phaseColor }]}>
          {phaseLabel}
        </Typography>
      </View>

      <Typography style={styles.text}>
        Confidence: {confidencePercent}%
      </Typography>

      <Typography style={styles.text}>Duration: {phaseDuration}s</Typography>

      <Typography style={styles.text}>
        Accel: {motionState.currentAcceleration.toFixed(3)} m/s²
      </Typography>

      <Typography style={styles.text}>
        Variance: {motionState.currentVariance.toFixed(4)}
      </Typography>

      <Typography style={[styles.text, { marginTop: 4, fontWeight: 'bold' }]}>
        Stops: {motionState.stopCount} (Total: {stationStopCount})
      </Typography>

      <View style={[styles.modeIndicator, { backgroundColor: '#ff6600' }]}>
        <Typography style={[styles.text, { fontSize: 10 }]}>
          オフラインモード
        </Typography>
      </View>
    </View>
  );
};

export default React.memo(MotionDebugOverlay);
