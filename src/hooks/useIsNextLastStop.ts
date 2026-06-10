import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import { selectedBoundAtom } from '../store/atoms/station';
import { useLoopLine } from './useLoopLine';
import { useNextStation } from './useNextStation';

export const useIsNextLastStop = (): boolean => {
  const selectedBound = useAtomValue(selectedBoundAtom);
  const nextStation = useNextStation();
  const { isLoopLine } = useLoopLine();

  const isNextLastStop = useMemo(() => {
    if (isLoopLine) {
      return false;
    }

    return nextStation?.groupId === selectedBound?.groupId;
  }, [isLoopLine, nextStation?.groupId, selectedBound?.groupId]);

  return isNextLastStop;
};
