import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import stationState from '../store/atoms/station';
import { useLoopLine } from './useLoopLine';
import { useNextStation } from './useNextStation';

const useIsNextLastStop = (): boolean => {
  const { selectedBound } = useRecoilValue(stationState);
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

export default useIsNextLastStop;
