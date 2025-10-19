import { useLazyQuery } from '@apollo/client/react';
import { useRef } from 'react';
import type { Station } from '~/@types/graphql';
import {
  GET_LINE_GROUP_STATIONS,
  GET_LINE_STATIONS,
} from '~/lib/graphql/queries';
import type { SavedRoute } from '~/models/SavedRoute';

type GetLineStationsData = {
  lineStations: Station[];
};

type GetLineStationsVariables = {
  lineId: number;
  stationId?: number;
};

type GetLineGroupStationsData = {
  lineGroupStations: Station[];
};

type GetLineGroupStationsVariables = {
  lineGroupId: number;
};

export const useStationsCache = () => {
  const [fetchByLineId] = useLazyQuery<
    GetLineStationsData,
    GetLineStationsVariables
  >(GET_LINE_STATIONS);
  // lineGroupId 用。命名を実装に合わせる
  const [fetchByLineGroupId] = useLazyQuery<
    GetLineGroupStationsData,
    GetLineGroupStationsVariables
  >(GET_LINE_GROUP_STATIONS);
  const cacheRef = useRef(new Map<string, Station[]>());
  const pendingRef = useRef(new Map<string, Promise<Station[]>>());

  const getStations = async (route: SavedRoute): Promise<Station[]> => {
    const cached = cacheRef.current.get(route.id);
    if (cached) return cached;
    const existing = pendingRef.current.get(route.id);
    if (existing) return existing;
    const p = (async (): Promise<Station[]> => {
      if (route.hasTrainType) {
        const { data, error } = await fetchByLineGroupId({
          variables: {
            lineGroupId: route.trainTypeId,
          },
        });
        if (error || !data) {
          // エラー時はキャッシュしない
          throw error ?? new Error('Failed to fetch lineGroupStations');
        }
        const stations = data.lineGroupStations ?? [];
        cacheRef.current.set(route.id, stations);
        return stations;
      }
      const { data, error } = await fetchByLineId({
        variables: { lineId: route.lineId },
      });
      if (error || !data) {
        // エラー時はキャッシュしない
        throw error ?? new Error('Failed to fetch lineStations');
      }
      const stations = data.lineStations ?? [];
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
