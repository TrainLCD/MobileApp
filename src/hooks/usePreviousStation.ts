import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import { Station } from '../models/StationAPI';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import dropEitherJunctionStation from '../utils/dropJunctionStation';
import getIsPass from '../utils/isPass';
import useCurrentStation from './useCurrentStation';

const usePreviousStation = (): Station | undefined => {
  const {
    stations: stationsFromState,
    selectedDirection,
    arrived,
  } = useRecoilValue(stationState);
  const { stationForHeader } = useRecoilValue(navigationState);

  const stations = useMemo(
    () => dropEitherJunctionStation(stationsFromState, selectedDirection),
    [selectedDirection, stationsFromState]
  );

  const station = useCurrentStation({ skipPassStation: true });
  const reversedStations = useMemo(
    () =>
      selectedDirection === 'INBOUND' ? stations : stations.slice().reverse(),
    [selectedDirection, stations]
  );

  const currentStationIndex = reversedStations.findIndex(
    (s) => s.groupId === station?.groupId
  );
  if (currentStationIndex === -1) {
    return station ?? undefined;
  }
  const beforeStations = reversedStations
    .slice(0, currentStationIndex)
    .filter((s) => !getIsPass(s));

  if (stationForHeader?.id === station?.id && !arrived) {
    return beforeStations[beforeStations.length];
  }

  return beforeStations[beforeStations.length - 1] ?? station;
};

export default usePreviousStation;
