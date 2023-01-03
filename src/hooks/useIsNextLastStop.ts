import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import { getIsLoopLine } from '../utils/loopLine';
import useCurrentLine from './useCurrentLine';
import useNextStation from './useNextStation';

const useIsNextLastStop = (): boolean => {
  const { selectedDirection, stations } = useRecoilValue(stationState);
  const { trainType } = useRecoilValue(navigationState);
  const currentLine = useCurrentLine();
  const nextStation = useNextStation();

  const isNextLastStop = useMemo(() => {
    if (getIsLoopLine(currentLine, trainType)) {
      return false;
    }

    return selectedDirection === 'INBOUND'
      ? stations.findIndex((s) => s.groupId === nextStation?.groupId) ===
          stations.length - 1
      : stations
          .slice()
          .reverse()
          .findIndex((s) => s.groupId === nextStation?.groupId) ===
          stations.length - 1;
  }, [
    currentLine,
    nextStation?.groupId,
    selectedDirection,
    stations,
    trainType,
  ]);

  return isNextLastStop;
};

export default useIsNextLastStop;
