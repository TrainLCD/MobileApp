import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import stationState from '../store/atoms/station';
import { useLoopLine } from './useLoopLine';
import { useNextStation } from './useNextStation';

export const useIsNextLastStop = (): boolean => {
  const { selectedBound } = useAtomValue(stationState);
  const nextStation = useNextStation();
  const { isLoopLine } = useLoopLine();

  const isNextLastStop = useMemo(() => {
    if (isLoopLine) {
      return false;
    }

    return nextStation?.id === selectedBound?.id;
  }, [isLoopLine, nextStation?.id, selectedBound?.id]);

  return isNextLastStop;
};
