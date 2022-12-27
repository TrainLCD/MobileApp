import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import { Station } from '../models/StationAPI';
import stationState from '../store/atoms/station';
import getIsPass from '../utils/isPass';

const usePreviousStation = (): Station | undefined => {
  const { station, stations, selectedDirection } = useRecoilValue(stationState);

  const reversedStations = useMemo(
    () =>
      selectedDirection === 'INBOUND' ? stations : stations.slice().reverse(),
    [selectedDirection, stations]
  );

  const currentStationIndex = reversedStations.findIndex(
    (s) => s.groupId === station?.groupId
  );
  if (currentStationIndex === -1) {
    return undefined;
  }
  const beforeStations = reversedStations
    .slice(0, currentStationIndex)
    .filter((s) => !getIsPass(s));
  return beforeStations[beforeStations.length - 1];
};

export default usePreviousStation;
