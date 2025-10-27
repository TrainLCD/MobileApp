import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import type { Station } from '~/@types/graphql';
import stationState from '../store/atoms/station';
import dropEitherJunctionStation from '../utils/dropJunctionStation';
import getIsPass from '../utils/isPass';
import { useCurrentStation } from './useCurrentStation';

export const usePreviousStation = (skipPass = true): Station | undefined => {
  const { stations: stationsFromState, selectedDirection } =
    useAtomValue(stationState);
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
