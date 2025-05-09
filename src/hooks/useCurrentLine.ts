import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import lineState from '../store/atoms/line';
import stationState from '../store/atoms/station';
import { useCurrentStation } from './useCurrentStation';

export const useCurrentLine = () => {
  const { stations, selectedDirection } = useRecoilValue(stationState);
  const { selectedLine } = useRecoilValue(lineState);
  const currentStation = useCurrentStation();

  const actualCurrentStation = useMemo(
    () =>
      (selectedDirection === 'INBOUND'
        ? stations.slice().reverse()
        : stations
      ).find(
        (rs) =>
          rs.groupId === currentStation?.groupId ??
          rs.line?.id === selectedLine?.id
      ),
    [currentStation?.groupId, selectedDirection, selectedLine?.id, stations]
  );

  // NOTE: selectedLineがnullishの時はcurrentLineもnullishであってほしい
  return selectedLine && actualCurrentStation?.line;
};
