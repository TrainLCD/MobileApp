import getDistance from 'geolib/es/getDistance';
import { useAtomValue } from 'jotai';
import { useEffect, useMemo, useRef } from 'react';
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

  // 前回のnextStationまでの距離を保持
  const prevDistanceRef = useRef<number | null>(null);
  // 連続で距離が増加した回数
  const consecutiveIncreaseCountRef = useRef(0);
  // 連続増加中の累積距離(m)
  const cumulativeIncreaseRef = useRef(0);
  // 通知済みのnextStation ID（同一駅で再通知しない）
  const notifiedForStationIdRef = useRef<number | null>(null);
  // 逆方向検知フラグ（状態としてレンダーに反映するため）
  const wrongDirectionDetectedRef = useRef(false);

  // 到着時や行き先変更時にリセット
  useEffect(() => {
    if (arrived) {
      prevDistanceRef.current = null;
      consecutiveIncreaseCountRef.current = 0;
      cumulativeIncreaseRef.current = 0;
      wrongDirectionDetectedRef.current = false;
    }
  }, [arrived]);

  // selectedBound変更時にリセット
  useEffect(() => {
    prevDistanceRef.current = null;
    consecutiveIncreaseCountRef.current = 0;
    cumulativeIncreaseRef.current = 0;
    notifiedForStationIdRef.current = null;
    wrongDirectionDetectedRef.current = false;
  }, [selectedBound?.id]);

  const isWrongDirectionRaw = useMemo(() => {
    // 前提条件チェック
    if (!selectedBound || autoModeEnabled) {
      return false;
    }
    if (latitude == null || longitude == null) {
      return false;
    }
    if (
      !nextStation ||
      nextStation.latitude == null ||
      nextStation.longitude == null
    ) {
      return false;
    }
    // GPS精度が悪い場合はスキップ
    if (accuracy != null && accuracy > BAD_ACCURACY_THRESHOLD) {
      return false;
    }

    const currentDistance = getDistance(
      { latitude, longitude },
      {
        latitude: nextStation.latitude as number,
        longitude: nextStation.longitude as number,
      }
    );

    const prevDistance = prevDistanceRef.current;
    prevDistanceRef.current = currentDistance;

    if (prevDistance == null) {
      return wrongDirectionDetectedRef.current;
    }

    const increase = currentDistance - prevDistance;

    if (increase > 0) {
      consecutiveIncreaseCountRef.current += 1;
      cumulativeIncreaseRef.current += increase;
    } else {
      // 距離が減少した場合はカウンターをリセット
      consecutiveIncreaseCountRef.current = 0;
      cumulativeIncreaseRef.current = 0;
      wrongDirectionDetectedRef.current = false;
    }

    if (
      consecutiveIncreaseCountRef.current >= WRONG_DIRECTION_CONSECUTIVE_COUNT &&
      cumulativeIncreaseRef.current >= WRONG_DIRECTION_MIN_DISTANCE
    ) {
      // 同一のnextStationに対して既に通知済みならスキップ
      if (notifiedForStationIdRef.current === nextStation.id) {
        return wrongDirectionDetectedRef.current;
      }
      notifiedForStationIdRef.current = nextStation.id ?? null;
      wrongDirectionDetectedRef.current = true;
      return true;
    }

    return wrongDirectionDetectedRef.current;
  }, [
    accuracy,
    autoModeEnabled,
    latitude,
    longitude,
    nextStation,
    selectedBound,
  ]);

  return {
    isWrongDirection: !isLoopLine && isWrongDirectionRaw,
    isLoopLineWrongDirection: isLoopLine && isWrongDirectionRaw,
  };
};
