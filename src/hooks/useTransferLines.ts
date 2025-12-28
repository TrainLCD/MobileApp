import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import type { Line } from '~/@types/graphql';
import stationState from '../store/atoms/station';
import getIsPass from '../utils/isPass';
import { useCurrentStation } from './useCurrentStation';
import { useNextStation } from './useNextStation';
import { useTransferLinesFromStation } from './useTransferLinesFromStation';

type Option = { omitRepeatingLine?: boolean; omitJR?: boolean };

export const useTransferLines = (options?: Option): Line[] => {
  const { arrived } = useAtomValue(stationState);
  const currentStation = useCurrentStation(false, true);
  const nextStation = useNextStation();
  const targetStation = useMemo(
    () =>
      arrived && currentStation && !getIsPass(currentStation)
        ? currentStation
        : nextStation,
    [arrived, currentStation, nextStation]
  );

  const { omitRepeatingLine, omitJR } = options ?? {
    omitRepeatingLines: false,
    omitJR: false,
  };

  const transferLines = useTransferLinesFromStation(targetStation, {
    omitRepeatingLine,
    omitJR,
  });

  return transferLines;
};
