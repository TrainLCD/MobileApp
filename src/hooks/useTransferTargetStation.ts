import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import type { Station } from '~/@types/graphql';
import { arrivedAtom } from '../store/atoms/station';
import getIsPass from '../utils/isPass';
import { useCurrentStation } from './useCurrentStation';
import { useDisplayNextStation } from './useDisplayNextStation';

/**
 * 乗換案内の対象駅。
 *
 * ヘッダー・TTS が「まもなく」で読み上げる駅 (接近中はGPS基準の接近駅) と
 * 乗換案内の対象駅を一致させる。useNextStation 起点のままだと、到着判定の
 * 取りこぼしで stationState が古い場合に「まもなくA、B駅の乗換路線をご案内」
 * という不整合が起きる。
 */
export const useTransferTargetStation = (): Station | undefined => {
  const arrived = useAtomValue(arrivedAtom);
  const currentStation = useCurrentStation(false, true);
  const nextStation = useDisplayNextStation();

  return useMemo(
    () =>
      arrived && currentStation && !getIsPass(currentStation)
        ? currentStation
        : nextStation,
    [arrived, currentStation, nextStation]
  );
};
