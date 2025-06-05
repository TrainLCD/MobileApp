import { useMutation } from '@connectrpc/connect-query';
import { getStationsByCoordinates } from '~/gen/proto/stationapi-StationAPI_connectquery';

export const useFetchNearbyStation = () => {
  const {
    data,
    error: byCoordsError,
    status: byCoordsFetchStatus,
    mutateAsync: fetchByCoords,
  } = useMutation(getStationsByCoordinates);

  return {
    stations: data?.stations ?? [],
    fetchByCoords,
    isLoading: byCoordsFetchStatus === 'pending',
    error: byCoordsError,
  };
};
