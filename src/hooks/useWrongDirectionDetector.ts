import getDistance from 'geolib/es/getDistance';
import { useAtomValue } from 'jotai';
import { useEffect, useRef, useState } from 'react';
import { BAD_ACCURACY_THRESHOLD } from '~/constants/threshold';
import { locationAtom } from '~/store/atoms/location';
import navigationState from '~/store/atoms/navigation';
import stationState from '~/store/atoms/station';
import { useLoopLine } from './useLoopLine';
import { useNextStation } from './useNextStation';

// 連続何回の距離増加で逆方向と判定するか
const WRONG_DIRECTION_CONSECUTIVE_COUNT = 4;
// 逆方向判定に必要な最小累積距離(m)
const WRONG_DIRECTION_MIN_DISTANCE = 300;

export const useWrongDirectionDetector = (): {
  isWrongDirection: boolean;
  isLoopLineWrongDirection: boolean;
} => {
  const location = useAtomValue(locationAtom);
  const { arrived, selectedBound } = useAtomValue(stationState);
  const { autoModeEnabled } = useAtomValue(navigationState);
  const nextStation = useNextStation();
  const { isLoopLine } = useLoopLine();

  const latitude = location?.coords.latitude;
  const longitude = location?.coords.longitude;
  const accuracy = location?.coords.accuracy;

  // 依存配列用のプリミティブ値（オブジェクト参照の変化による不要な再実行を防ぐ）
  const selectedBoundId = selectedBound?.id;
  const nextStationId = nextStation?.id;
  const nextStationLat = nextStation?.latitude;
  const nextStationLon = nextStation?.longitude;

  // 前回のnextStationまでの距離を保持
  const prevDistanceRef = useRef<number | null>(null);
  // 連続で距離が増加した回数
  const consecutiveIncreaseCountRef = useRef(0);
  // 連続増加中の累積距離(m)
  const cumulativeIncreaseRef = useRef(0);
  // 通知済みのnextStation ID（undefinedは未設定、null/numberは通知済み駅ID）
  const notifiedForStationIdRef = useRef<number | null | undefined>(undefined);
  // 前回のnextStation ID（駅変更検知用）
  const prevNextStationIdRef = useRef<number | null | undefined>(undefined);

  const [wrongDirectionDetected, setWrongDirectionDetected] = useState(false);

  // 到着時にリセット
  useEffect(() => {
    if (arrived) {
      prevDistanceRef.current = null;
      consecutiveIncreaseCountRef.current = 0;
      cumulativeIncreaseRef.current = 0;
      notifiedForStationIdRef.current = undefined;
      setWrongDirectionDetected(false);
    }
  }, [arrived]);

  // selectedBound変更時にリセット
  useEffect(() => {
    if (selectedBoundId != null) {
      prevDistanceRef.current = null;
      consecutiveIncreaseCountRef.current = 0;
      cumulativeIncreaseRef.current = 0;
      notifiedForStationIdRef.current = undefined;
      setWrongDirectionDetected(false);
    }
  }, [selectedBoundId]);

  // 位置更新ごとに距離変化を計算し、逆方向判定を行う
  useEffect(() => {
    // 前提条件を満たさない場合は検知状態をリセットして終了
    if (
      selectedBoundId == null ||
      autoModeEnabled ||
      latitude == null ||
      longitude == null ||
      nextStationId === undefined ||
      nextStationLat == null ||
      nextStationLon == null ||
      (accuracy != null && accuracy > BAD_ACCURACY_THRESHOLD)
    ) {
      consecutiveIncreaseCountRef.current = 0;
      cumulativeIncreaseRef.current = 0;
      prevDistanceRef.current = null;
      notifiedForStationIdRef.current = undefined;
      setWrongDirectionDetected(false);
      return;
    }

    // nextStationが変わった場合は前回距離をリセットし、初回測定として扱う
    if (prevNextStationIdRef.current !== nextStationId) {
      prevNextStationIdRef.current = nextStationId;
      prevDistanceRef.current = null;
      consecutiveIncreaseCountRef.current = 0;
      cumulativeIncreaseRef.current = 0;
      notifiedForStationIdRef.current = undefined;
      setWrongDirectionDetected(false);
    }

    const currentDistance = getDistance(
      { latitude, longitude },
      {
        latitude: nextStationLat as number,
        longitude: nextStationLon as number,
      }
    );

    const prevDistance = prevDistanceRef.current;
    prevDistanceRef.current = currentDistance;

    // 初回測定は比較対象がないのでスキップ
    if (prevDistance == null) {
      return;
    }

    const increase = currentDistance - prevDistance;

    if (increase > 0) {
      consecutiveIncreaseCountRef.current += 1;
      cumulativeIncreaseRef.current += increase;
    } else {
      consecutiveIncreaseCountRef.current = 0;
      cumulativeIncreaseRef.current = 0;
      notifiedForStationIdRef.current = undefined;
      setWrongDirectionDetected(false);
    }

    if (
      consecutiveIncreaseCountRef.current >=
        WRONG_DIRECTION_CONSECUTIVE_COUNT &&
      cumulativeIncreaseRef.current >= WRONG_DIRECTION_MIN_DISTANCE
    ) {
      // 同一のnextStationに対して既に通知済みならスキップ
      if (
        notifiedForStationIdRef.current !== undefined &&
        notifiedForStationIdRef.current === nextStationId
      ) {
        return;
      }
      notifiedForStationIdRef.current = nextStationId ?? null;
      setWrongDirectionDetected(true);
    }
  }, [
    accuracy,
    autoModeEnabled,
    latitude,
    longitude,
    nextStationId,
    nextStationLat,
    nextStationLon,
    selectedBoundId,
  ]);

  return {
    isWrongDirection: !isLoopLine && wrongDirectionDetected,
    isLoopLineWrongDirection: isLoopLine && wrongDirectionDetected,
  };
};
