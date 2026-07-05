import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import type { Line } from '~/@types/graphql';
import { arrivedAtom } from '../store/atoms/station';
import getIsPass from '../utils/isPass';
import { useCurrentStation } from './useCurrentStation';
import { useDisplayNextStation } from './useDisplayNextStation';
import { useTransferLinesFromStation } from './useTransferLinesFromStation';

type Option = {
  omitRepeatingLine?: boolean;
  omitJR?: boolean;
};

export const useTransferLines = (options?: Option): Line[] => {
  const arrived = useAtomValue(arrivedAtom);
  const currentStation = useCurrentStation(false, true);
  // ヘッダー・TTS が「まもなく」で読み上げる駅 (接近中はGPS基準の接近駅) と
  // 乗換案内の対象駅を一致させる。useNextStation 起点のままだと、到着判定の
  // 取りこぼしで stationState が古い場合に「まもなくA、B駅の乗換路線をご案内」
  // という不整合が起きる。
  const nextStation = useDisplayNextStation();
  const targetStation = useMemo(
    () =>
      arrived && currentStation && !getIsPass(currentStation)
        ? currentStation
        : nextStation,
    [arrived, currentStation, nextStation]
  );

  const { omitRepeatingLine, omitJR } = options ?? {
    omitRepeatingLine: false,
    omitJR: false,
  };

  const transferLines = useTransferLinesFromStation(targetStation, {
    omitRepeatingLine,
    omitJR,
  });

  return transferLines;
};
