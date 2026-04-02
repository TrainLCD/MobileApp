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

  // 前回のnextStationまでの距離を保持
  const prevDistanceRef = useRef<number | null>(null);
  // 連続で距離が増加した回数
  const consecutiveIncreaseCountRef = useRef(0);
  // 連続増加中の累積距離(m)
  const cumulativeIncreaseRef = useRef(0);
  // 通知済みのnextStation ID（同一駅で再通知しない）
  const notifiedForStationIdRef = useRef<number | null>(null);
  // 前回のnextStation ID（駅変更検知用）
  const prevNextStationIdRef = useRef<number | null | undefined>(null);

  const [wrongDirectionDetected, setWrongDirectionDetected] = useState(false);

  // 到着時にリセット
  useEffect(() => {
    if (arrived) {
      prevDistanceRef.current = null;
      consecutiveIncreaseCountRef.current = 0;
      cumulativeIncreaseRef.current = 0;
      notifiedForStationIdRef.current = null;
      setWrongDirectionDetected(false);
    }
  }, [arrived]);

  // selectedBound変更時にリセット
  const selectedBoundId = selectedBound?.id;
  useEffect(() => {
    if (selectedBoundId != null) {
      prevDistanceRef.current = null;
      consecutiveIncreaseCountRef.current = 0;
      cumulativeIncreaseRef.current = 0;
      notifiedForStationIdRef.current = null;
      setWrongDirectionDetected(false);
    }
  }, [selectedBoundId]);

  // 位置更新ごとに距離変化を計算し、逆方向判定を行う
  useEffect(() => {
    // 前提条件を満たさない場合は検知状態をリセットして終了
    if (
      !selectedBound ||
      autoModeEnabled ||
      latitude == null ||
      longitude == null ||
      !nextStation ||
      nextStation.latitude == null ||
      nextStation.longitude == null ||
      (accuracy != null && accuracy > BAD_ACCURACY_THRESHOLD)
    ) {
      consecutiveIncreaseCountRef.current = 0;
      cumulativeIncreaseRef.current = 0;
      prevDistanceRef.current = null;
      notifiedForStationIdRef.current = null;
      setWrongDirectionDetected(false);
      return;
    }

    // nextStationが変わった場合は前回距離をリセットし、初回測定として扱う
    if (prevNextStationIdRef.current !== nextStation.id) {
      prevNextStationIdRef.current = nextStation.id;
      prevDistanceRef.current = null;
      consecutiveIncreaseCountRef.current = 0;
      cumulativeIncreaseRef.current = 0;
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
      notifiedForStationIdRef.current = null;
      setWrongDirectionDetected(false);
    }

    if (
      consecutiveIncreaseCountRef.current >=
        WRONG_DIRECTION_CONSECUTIVE_COUNT &&
      cumulativeIncreaseRef.current >= WRONG_DIRECTION_MIN_DISTANCE
    ) {
      // 同一のnextStationに対して既に通知済みならスキップ
      if (notifiedForStationIdRef.current === nextStation.id) {
        return;
      }
      notifiedForStationIdRef.current = nextStation.id ?? null;
      setWrongDirectionDetected(true);
    }
  }, [
    accuracy,
    autoModeEnabled,
    latitude,
    longitude,
    nextStation,
    selectedBound,
  ]);

  return {
    isWrongDirection: !isLoopLine && wrongDirectionDetected,
    isLoopLineWrongDirection: isLoopLine && wrongDirectionDetected,
  };
};
