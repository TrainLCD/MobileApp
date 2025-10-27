import { useCallback } from 'react';
import type { Station } from '~/@types/graphql';
import { useCurrentStation } from './useCurrentStation';

export const useGetStationsWithTermination = () => {
  const currentStation = useCurrentStation();

  const getStations = useCallback(
    (destination: Station | null, stationsFromArgs: Station[]) => {
      if (!destination || !currentStation) {
        return stationsFromArgs;
      }

      const destinationIndex = stationsFromArgs.findIndex(
        (s) => s.groupId === destination.groupId
      );
      const currentStationIndex = stationsFromArgs.findIndex(
        (s) => s.groupId === currentStation.groupId
      );
      if (destinationIndex === -1 || currentStationIndex === -1) {
        return stationsFromArgs;
      }

      if (currentStationIndex < destinationIndex) {
        return stationsFromArgs.slice(0, destinationIndex + 1);
      }
      return stationsFromArgs.slice(destinationIndex);
    },
    [currentStation]
  );

  return getStations;
};
