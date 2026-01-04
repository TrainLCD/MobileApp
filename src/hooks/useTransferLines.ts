import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import type { Line } from '~/@types/graphql';
import stationState from '../store/atoms/station';
import getIsPass from '../utils/isPass';
import { useCurrentStation } from './useCurrentStation';
import { useNextStation } from './useNextStation';
import { useTransferLinesFromStation } from './useTransferLinesFromStation';

type Option = {
  omitRepeatingLine?: boolean;
  omitJR?: boolean;
  hideBuses?: boolean;
};

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

  const { omitRepeatingLine, omitJR, hideBuses } = options ?? {
    omitRepeatingLines: false,
    omitJR: false,
    hideBuses: true,
  };

  const transferLines = useTransferLinesFromStation(targetStation, {
    omitRepeatingLine,
    omitJR,
    hideBuses,
  });

  return transferLines;
};
