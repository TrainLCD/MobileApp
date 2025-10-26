import { useLazyQuery } from '@apollo/client/react';
import { useCallback, useMemo } from 'react';
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
  const [fetchStationsNearby, { data, error: byCoordsError, loading }] =
    useLazyQuery<GetStationsNearbyData, GetStationsNearbyVariables>(
      GET_STATIONS_NEARBY
    );

  const fetchByCoords = useCallback(
    (variables: GetStationsNearbyVariables) =>
      fetchStationsNearby({ variables }),
    [fetchStationsNearby]
  );

  const stations = useMemo(
    () =>
      (data?.stationsNearby ?? []).filter((station): station is Station =>
        Boolean(station)
      ),
    [data?.stationsNearby]
  );

  return {
    stations,
    fetchByCoords,
    isLoading: loading,
    error: byCoordsError,
  };
};
