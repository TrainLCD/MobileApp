import { useAtomValue, useSetAtom } from 'jotai';
import { useCallback, useEffect, useRef } from 'react';
import { POOR_GPS_ACCURACY_THRESHOLD } from '~/constants/motion';
import { locationAtom } from '~/store/atoms/location';
import navigationState from '~/store/atoms/navigation';
import stationState from '~/store/atoms/station';
import {
  motionDetectionEnabledAtom,
  stationStopDetectedAtom,
  trainMotionAtom,
} from '~/store/atoms/trainMotion';
import { useNextStation } from './useNextStation';
import { useTrainMotionDetector } from './useTrainMotionDetector';

// GPS精度が悪い状態が続いた回数の閾値
const POOR_GPS_COUNT_THRESHOLD = 5;

interface OfflineDetectorState {
  // オフライン検出モードが有効か
  isOfflineModeActive: boolean;
  // 検出した停車回数（駅通過の推定に使用）
  detectedStopCount: number;
  // 現在の移動フェーズ
  currentPhase: string;
  // 信頼度
  confidence: number;
}

/**
 * GPS精度が悪い環境（地下鉄等）で加速度センサーを使った駅検出を行うフック
 *
 * 動作:
 * 1. GPS精度を監視し、精度が悪い状態が続いたら加速度センサーモードを有効化
 * 2. 停車を検出したら次の駅に遷移
 * 3. GPS精度が回復したら通常モードに戻る
 */
export const useOfflineStationDetector = (): OfflineDetectorState => {
  // 加速度センサー検出を起動
  useTrainMotionDetector();

  const location = useAtomValue(locationAtom);
  const motionState = useAtomValue(trainMotionAtom);
  const stationStopCount = useAtomValue(stationStopDetectedAtom);
  const setMotionEnabled = useSetAtom(motionDetectionEnabledAtom);
  const setStation = useSetAtom(stationState);
  const setNavigation = useSetAtom(navigationState);

  const nextStation = useNextStation();

  // 前回の停車カウント
  const prevStopCountRef = useRef<number>(0);
  // GPS精度が悪い連続回数
  const poorGpsCountRef = useRef<number>(0);

  /**
   * GPS精度を評価し、オフラインモードの有効/無効を切り替え
   */
  const evaluateGpsQuality = useCallback(() => {
    const currentAccuracy = location?.coords.accuracy;

    if (
      currentAccuracy == null ||
      currentAccuracy >= POOR_GPS_ACCURACY_THRESHOLD
    ) {
      poorGpsCountRef.current += 1;
    } else {
      poorGpsCountRef.current = Math.max(0, poorGpsCountRef.current - 1);
    }

    // GPS精度が悪い状態が続いたらオフラインモードを有効化
    if (
      poorGpsCountRef.current >= POOR_GPS_COUNT_THRESHOLD &&
      !motionState.isEnabled
    ) {
      setMotionEnabled(true);
    }

    // GPS精度が回復したらオフラインモードを無効化
    if (poorGpsCountRef.current === 0 && motionState.isEnabled) {
      setMotionEnabled(false);
    }
  }, [location?.coords.accuracy, motionState.isEnabled, setMotionEnabled]);

  /**
   * 停車検出時に次の駅に遷移
   */
  const handleStationTransition = useCallback(() => {
    if (!motionState.isEnabled || !nextStation) {
      return;
    }

    // 新しい停車が検出された
    if (stationStopCount > prevStopCountRef.current) {
      prevStopCountRef.current = stationStopCount;

      // 次の駅に遷移
      setStation((prev) => ({
        ...prev,
        arrived: true,
        approaching: false,
        station: nextStation,
      }));

      setNavigation((prev) => ({
        ...prev,
        stationForHeader: nextStation,
      }));
    }
  }, [
    motionState.isEnabled,
    nextStation,
    stationStopCount,
    setStation,
    setNavigation,
  ]);

  // GPS精度の監視
  useEffect(() => {
    evaluateGpsQuality();
  }, [evaluateGpsQuality]);

  // 停車検出時の駅遷移
  useEffect(() => {
    handleStationTransition();
  }, [handleStationTransition]);

  return {
    isOfflineModeActive: motionState.isEnabled,
    detectedStopCount: stationStopCount,
    currentPhase: motionState.phase,
    confidence: motionState.confidence,
  };
};
