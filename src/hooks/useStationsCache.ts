import { useMutation } from '@connectrpc/connect-query';
import { useRef } from 'react';
import type { Station } from '~/gen/proto/stationapi_pb';
import {
  getStationsByLineGroupId,
  getStationsByLineId,
} from '~/gen/proto/stationapi-StationAPI_connectquery';
import type { SavedRoute } from '~/models/SavedRoute';

export const useStationsCache = () => {
  const { mutateAsync: fetchByLineId } = useMutation(getStationsByLineId);
  const { mutateAsync: fetchByTrainTypeId } = useMutation(
    getStationsByLineGroupId
  );
  const cacheRef = useRef(new Map<string, Station[]>());

  const getStations = async (route: SavedRoute): Promise<Station[]> => {
    const cached = cacheRef.current.get(route.id);
    if (cached) return cached;
    const stations = route.hasTrainType
      ? (await fetchByTrainTypeId({ lineGroupId: route.trainTypeId })).stations
      : (await fetchByLineId({ lineId: route.lineId })).stations;
    cacheRef.current.set(route.id, stations);
    return stations;
  };

  const clear = () => cacheRef.current.clear();

  return { getStations, clear };
};
