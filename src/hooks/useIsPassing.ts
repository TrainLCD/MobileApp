import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import stationState from '../store/atoms/station';
import { getIsPassFromStopCondition } from '../utils/isPass';
import { useCurrentStation } from './useCurrentStation';

export const useIsPassing = (): boolean => {
  const { arrived } = useAtomValue(stationState);
  const currentStation = useCurrentStation();

  const passing = useMemo(
    () => getIsPassFromStopCondition(currentStation?.stopCondition) && arrived,
    [arrived, currentStation?.stopCondition]
  );

  return passing;
};
