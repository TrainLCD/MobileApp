import { Accelerometer, type AccelerometerMeasurement } from 'expo-sensors';
import { useAtomValue, useSetAtom } from 'jotai';
import { useCallback, useEffect, useRef } from 'react';
import {
  ACCELERATION_THRESHOLD,
  ACCELEROMETER_UPDATE_INTERVAL_MS,
  DECELERATION_THRESHOLD,
  GRAVITY,
  LOW_PASS_FILTER_ALPHA,
  MIN_SAMPLES_FOR_STATE_CHANGE,
  MOTION_SAMPLE_WINDOW_SIZE,
  MOVING_VARIANCE_THRESHOLD,
  STATION_STOP_MIN_DURATION_MS,
  STOP_ACCELERATION_THRESHOLD,
  STOP_DETECTION_WINDOW_SIZE,
  STOPPED_VARIANCE_THRESHOLD,
} from '~/constants/motion';
import {
  type AccelerationSample,
  stationStopDetectedAtom,
  type TrainMotionPhase,
  trainMotionAtom,
} from '~/store/atoms/trainMotion';

interface FilteredAcceleration {
  x: number;
  y: number;
  z: number;
}

/**
 * 加速度センサーを使用して列車の移動状態を検出するフック
 *
 * 検出する状態:
 * - stopped: 停車中（加速度が低く、振動も少ない）
 * - accelerating: 加速中（正の加速度が継続）
 * - cruising: 巡行中（振動はあるが加速度は小さい）
 * - decelerating: 減速中（負の加速度が継続）
 */
export const useTrainMotionDetector = (): void => {
  const setTrainMotion = useSetAtom(trainMotionAtom);
  const setStationStopDetected = useSetAtom(stationStopDetectedAtom);
  const motionState = useAtomValue(trainMotionAtom);

  // サンプルバッファ
  const samplesRef = useRef<AccelerationSample[]>([]);
  // ローパスフィルタ用の前回値
  const filteredRef = useRef<FilteredAcceleration>({ x: 0, y: 0, z: 0 });
  // 重力成分の推定値（ハイパスフィルタ用）
  const gravityRef = useRef<FilteredAcceleration>({ x: 0, y: 0, z: 0 });
  // 状態遷移カウンタ
  const stateCounterRef = useRef<number>(0);
  // 候補フェーズ
  const candidatePhaseRef = useRef<TrainMotionPhase>('unknown');
  // 停車開始時刻
  const stopStartTimeRef = useRef<number | null>(null);
  // 現在のフェーズをrefで保持（コールバックの依存を安定化）
  const motionPhaseRef = useRef<TrainMotionPhase>(motionState.phase);

  // motionState.phaseが変更されたらrefを更新
  useEffect(() => {
    motionPhaseRef.current = motionState.phase;
  }, [motionState.phase]);

  /**
   * 重力成分を除去した加速度を計算
   * ハイパスフィルタを使用して重力の影響を除去
   */
  const removeGravity = useCallback(
    (raw: AccelerometerMeasurement): FilteredAcceleration => {
      const alpha = 0.8; // ハイパスフィルタ係数

      // 重力成分を更新（ローパスフィルタで推定）
      gravityRef.current = {
        x: alpha * gravityRef.current.x + (1 - alpha) * raw.x,
        y: alpha * gravityRef.current.y + (1 - alpha) * raw.y,
        z: alpha * gravityRef.current.z + (1 - alpha) * raw.z,
      };

      // 重力を除去した線形加速度
      return {
        x: raw.x - gravityRef.current.x,
        y: raw.y - gravityRef.current.y,
        z: raw.z - gravityRef.current.z,
      };
    },
    []
  );

  /**
   * ローパスフィルタでノイズを除去
   */
  const applyLowPassFilter = useCallback(
    (current: FilteredAcceleration): FilteredAcceleration => {
      const alpha = LOW_PASS_FILTER_ALPHA;
      filteredRef.current = {
        x: alpha * filteredRef.current.x + (1 - alpha) * current.x,
        y: alpha * filteredRef.current.y + (1 - alpha) * current.y,
        z: alpha * filteredRef.current.z + (1 - alpha) * current.z,
      };
      return filteredRef.current;
    },
    []
  );

  /**
   * 加速度の大きさ（マグニチュード）を計算
   * 単位: G（重力加速度）→ m/s² に変換
   */
  const calculateMagnitude = useCallback(
    (acc: FilteredAcceleration): number => {
      return Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2) * GRAVITY;
    },
    []
  );

  /**
   * サンプルの分散を計算
   */
  const calculateVariance = useCallback(
    (samples: AccelerationSample[]): number => {
      if (samples.length < 2) return 0;

      const magnitudes = samples.map((s) => s.magnitude);
      const mean = magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length;
      const squaredDiffs = magnitudes.map((m) => (m - mean) ** 2);
      return squaredDiffs.reduce((a, b) => a + b, 0) / magnitudes.length;
    },
    []
  );

  /**
   * 平均加速度を計算（進行方向の加速度を推定）
   * 移動平均の変化率から加速/減速を判定
   */
  const calculateAccelerationTrend = useCallback(
    (samples: AccelerationSample[]): number => {
      if (samples.length < STOP_DETECTION_WINDOW_SIZE) return 0;

      const recentSamples = samples.slice(-STOP_DETECTION_WINDOW_SIZE);
      const firstHalf = recentSamples.slice(
        0,
        Math.floor(recentSamples.length / 2)
      );
      const secondHalf = recentSamples.slice(
        Math.floor(recentSamples.length / 2)
      );

      const firstAvg =
        firstHalf.reduce((a, b) => a + b.magnitude, 0) / firstHalf.length;
      const secondAvg =
        secondHalf.reduce((a, b) => a + b.magnitude, 0) / secondHalf.length;

      // 変化率を加速度として返す
      const timeDiff =
        (secondHalf[secondHalf.length - 1].timestamp - firstHalf[0].timestamp) /
        1000;
      return timeDiff > 0 ? (secondAvg - firstAvg) / timeDiff : 0;
    },
    []
  );

  /**
   * 移動状態を判定
   */
  const determinePhase = useCallback(
    (
      avgMagnitude: number,
      variance: number,
      accelerationTrend: number
    ): TrainMotionPhase => {
      // 停車中の判定: 加速度が低く、振動も少ない
      if (
        avgMagnitude < STOP_ACCELERATION_THRESHOLD &&
        variance < STOPPED_VARIANCE_THRESHOLD
      ) {
        return 'stopped';
      }

      // 加速中の判定: 正の加速度トレンド
      if (
        accelerationTrend > ACCELERATION_THRESHOLD &&
        variance > STOPPED_VARIANCE_THRESHOLD
      ) {
        return 'accelerating';
      }

      // 減速中の判定: 負の加速度トレンド
      if (
        accelerationTrend < DECELERATION_THRESHOLD &&
        variance > STOPPED_VARIANCE_THRESHOLD
      ) {
        return 'decelerating';
      }

      // 巡行中の判定: 一定の振動があるが加速度変化は小さい
      if (variance > MOVING_VARIANCE_THRESHOLD) {
        return 'cruising';
      }

      return 'unknown';
    },
    []
  );

  /**
   * 加速度データを処理
   */
  const processAccelerometerData = useCallback(
    (data: AccelerometerMeasurement) => {
      // 重力除去
      const withoutGravity = removeGravity(data);
      // ノイズ除去
      const filtered = applyLowPassFilter(withoutGravity);
      // マグニチュード計算
      const magnitude = calculateMagnitude(filtered);

      const sample: AccelerationSample = {
        x: filtered.x,
        y: filtered.y,
        z: filtered.z,
        magnitude,
        timestamp: Date.now(),
      };

      // サンプルをバッファに追加
      samplesRef.current = [
        ...samplesRef.current.slice(-(MOTION_SAMPLE_WINDOW_SIZE - 1)),
        sample,
      ];

      // 十分なサンプルが集まるまで待機
      if (samplesRef.current.length < MIN_SAMPLES_FOR_STATE_CHANGE) {
        return;
      }

      // 統計値を計算
      const variance = calculateVariance(samplesRef.current);
      const avgMagnitude =
        samplesRef.current.reduce((a, b) => a + b.magnitude, 0) /
        samplesRef.current.length;
      const accelerationTrend = calculateAccelerationTrend(samplesRef.current);

      // 状態を判定
      const detectedPhase = determinePhase(
        avgMagnitude,
        variance,
        accelerationTrend
      );

      // 状態遷移のヒステリシス（安定性のため）
      if (detectedPhase === candidatePhaseRef.current) {
        stateCounterRef.current += 1;
      } else {
        candidatePhaseRef.current = detectedPhase;
        stateCounterRef.current = 1;
      }

      // 状態を確定
      if (stateCounterRef.current >= MIN_SAMPLES_FOR_STATE_CHANGE) {
        const now = Date.now();
        const currentPhase = motionPhaseRef.current;

        // 停車検出のロジック
        if (detectedPhase === 'stopped' && currentPhase !== 'stopped') {
          // 停車開始
          stopStartTimeRef.current = now;
        }

        // 停車から発車への遷移を検出（駅通過）
        if (
          currentPhase === 'stopped' &&
          detectedPhase !== 'stopped' &&
          stopStartTimeRef.current !== null
        ) {
          const stopDuration = now - stopStartTimeRef.current;

          // 一定時間以上停車していた場合は駅停車とみなす
          if (stopDuration >= STATION_STOP_MIN_DURATION_MS) {
            setStationStopDetected((prev) => prev + 1);
          }
          stopStartTimeRef.current = null;
        }

        // 信頼度を計算（状態が安定しているほど高い）
        const confidence = Math.min(
          stateCounterRef.current / (MIN_SAMPLES_FOR_STATE_CHANGE * 2),
          1
        );

        setTrainMotion((prev) => ({
          ...prev,
          phase: detectedPhase,
          confidence,
          phaseStartTime:
            detectedPhase !== currentPhase ? now : prev.phaseStartTime,
          lastStopTime: detectedPhase === 'stopped' ? now : prev.lastStopTime,
          stopCount:
            currentPhase === 'stopped' && detectedPhase !== 'stopped'
              ? prev.stopCount + 1
              : prev.stopCount,
          currentAcceleration: avgMagnitude,
          currentVariance: variance,
        }));
      }
    },
    [
      removeGravity,
      applyLowPassFilter,
      calculateMagnitude,
      calculateVariance,
      calculateAccelerationTrend,
      determinePhase,
      setTrainMotion,
      setStationStopDetected,
    ]
  );

  // 加速度センサーのサブスクリプション管理
  useEffect(() => {
    if (!motionState.isEnabled) {
      return;
    }

    // サンプリングレートを設定
    Accelerometer.setUpdateInterval(ACCELEROMETER_UPDATE_INTERVAL_MS);

    // サブスクリプション開始
    const subscription = Accelerometer.addListener(processAccelerometerData);

    return () => {
      subscription.remove();
      // バッファをクリア（stopStartTimeRefは停車検出の継続性を保つためリセットしない）
      samplesRef.current = [];
      stateCounterRef.current = 0;
      candidatePhaseRef.current = 'unknown';
    };
  }, [motionState.isEnabled, processAccelerometerData]);
};
