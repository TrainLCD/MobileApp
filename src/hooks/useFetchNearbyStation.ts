import { useLazyQuery } from '@apollo/client/react';
import type { Station } from '~/@types/graphql';
import { GET_STATIONS_NEARBY } from '~/lib/graphql/queries';

type GetStationsNearbyData = {
  stationsNearby: Station[];
};

type GetStationsNearbyVariables = {
  latitude: number;
  longitude: number;
  limit?: number;
};

export const useFetchNearbyStation = () => {
  const [fetchByCoords, { data, error: byCoordsError, loading }] = useLazyQuery<
    GetStationsNearbyData,
    GetStationsNearbyVariables
  >(GET_STATIONS_NEARBY);

  return {
    stations: data?.stationsNearby ?? [],
    fetchByCoords,
    isLoading: loading,
    error: byCoordsError,
  };
};
