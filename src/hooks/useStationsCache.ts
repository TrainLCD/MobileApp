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
  // lineGroupId 用。命名を実装に合わせる
  const { mutateAsync: fetchByLineGroupId } = useMutation(
    getStationsByLineGroupId
  );
  const cacheRef = useRef(new Map<string, Station[]>());
  const pendingRef = useRef(new Map<string, Promise<Station[]>>());

  const getStations = async (route: SavedRoute): Promise<Station[]> => {
    const cached = cacheRef.current.get(route.id);
    if (cached) return cached;
    const existing = pendingRef.current.get(route.id);
    if (existing) return existing;
    const p = (async (): Promise<Station[]> => {
      const { stations } = route.hasTrainType
        ? await fetchByLineGroupId({
            // API expects line_group_id (train type group)
            lineGroupId: route.trainTypeId,
          })
        : await fetchByLineId({ lineId: route.lineId });
      cacheRef.current.set(route.id, stations);
      return stations;
    })();
    pendingRef.current.set(route.id, p);
    return p.finally(() => {
      if (pendingRef.current.get(route.id) === p) {
        pendingRef.current.delete(route.id);
      }
    });
  };

  const clear = () => cacheRef.current.clear();

  return { getStations, clear };
};
