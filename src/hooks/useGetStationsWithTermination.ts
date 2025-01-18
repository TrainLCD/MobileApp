import { useCallback } from 'react';
import type { Station } from '../../gen/proto/stationapi_pb';
import { useCurrentStation } from './useCurrentStation';

export const useGetStationsWithTermination = () => {
  const currentStation = useCurrentStation();

  const getStations = useCallback(
    (destination: Station | null, stationsFromArgs: Station[]) => {
      const destinationIndex = stationsFromArgs.findIndex(
        (s) => s.groupId === destination?.groupId
      );
      const currentStationIndex = stationsFromArgs.findIndex(
        (s) => s.groupId === currentStation?.groupId
      );

      if (currentStationIndex < destinationIndex) {
        return stationsFromArgs.slice(0, destinationIndex + 1);
      }
      return stationsFromArgs.slice(destinationIndex);
    },
    [currentStation]
  );

  return getStations;
};
