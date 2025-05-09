import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import type { Station } from '../../gen/proto/stationapi_pb';
import stationState from '../store/atoms/station';
import dropEitherJunctionStation from '../utils/dropJunctionStation';
import getIsPass from '../utils/isPass';
import { useCurrentStation } from './useCurrentStation';

const usePreviousStation = (skipPass = true): Station | undefined => {
  const { stations: stationsFromState, selectedDirection } =
    useRecoilValue(stationState);
  const station = useCurrentStation(true);

  const stations = useMemo(
    () =>
      dropEitherJunctionStation(stationsFromState, selectedDirection).filter(
        (s) => (skipPass ? getIsPass(s) : true)
      ),
    [selectedDirection, skipPass, stationsFromState]
  );

  const reversedStations = useMemo(
    () =>
      selectedDirection === 'INBOUND' ? stations : stations.slice().reverse(),
    [selectedDirection, stations]
  );

  const currentStationIndex = useMemo(
    () => reversedStations.findIndex((s) => s.groupId === station?.groupId) + 1,
    [reversedStations, station?.groupId]
  );
  const beforeStations = useMemo(
    () => reversedStations.slice(0, currentStationIndex),
    [currentStationIndex, reversedStations]
  );

  if (currentStationIndex === -1) {
    return station ?? undefined;
  }

  return beforeStations[beforeStations.length - 1];
};

export default usePreviousStation;
