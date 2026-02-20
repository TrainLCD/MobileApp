import { useEffect, useRef, useState } from 'react';
import type { Station } from '~/@types/graphql';
import { gqlClient } from '~/lib/gql';
import {
  GET_LINE_GROUP_LIST_STATIONS_PRESET,
  GET_LINE_LIST_STATIONS_PRESET,
} from '~/lib/graphql/queries';
import type { SavedRoute } from '~/models/SavedRoute';
import type { LoopItem } from '../store/atoms/navigation';
import { useSavedRoutes } from './useSavedRoutes';

export type UsePresetCarouselDataResult = {
  carouselData: LoopItem[];
  routes: SavedRoute[];
  isRoutesDBInitialized: boolean;
};

export const usePresetCarouselData = (): UsePresetCarouselDataResult => {
  const [carouselData, setCarouselData] = useState<LoopItem[]>([]);
  const prevRoutesKeyRef = useRef('');

  const {
    routes,
    updateRoutes,
    isInitialized: isRoutesDBInitialized,
  } = useSavedRoutes();

  useEffect(() => {
    if (!isRoutesDBInitialized) return;
    updateRoutes();
  }, [isRoutesDBInitialized, updateRoutes]);

  useEffect(() => {
    const routesKey = routes
      .map((r) => `${r.id}:${r.lineId}:${r.trainTypeId}:${r.hasTrainType}`)
      .join(',');
    if (routesKey === prevRoutesKeyRef.current) return;

    const fetchAsync = async () => {
      try {
        const lineRoutes = routes.filter((r) => !r.hasTrainType);
        const trainTypeRoutes = routes.filter((r) => r.hasTrainType);

        // !hasTrainType のルートを lineListStations で一括取得
        const lineStationsMap = new Map<number, Station[]>();
        const validLineRoutes = lineRoutes.filter((r) => r.lineId !== null);
        if (validLineRoutes.length > 0) {
          const lineIds = validLineRoutes.map((r) => r.lineId);
          const result = await gqlClient.query<{
            lineListStations: Station[];
          }>({
            query: GET_LINE_LIST_STATIONS_PRESET,
            variables: { lineIds },
          });
          for (const s of result.data?.lineListStations ?? []) {
            const lid = s.line?.id;
            if (lid == null) continue;
            const arr = lineStationsMap.get(lid);
            if (arr) {
              arr.push(s);
            } else {
              lineStationsMap.set(lid, [s]);
            }
          }
        }

        // hasTrainType のルートを lineGroupListStations で一括取得
        const trainTypeStationsMap = new Map<number, Station[]>();
        if (trainTypeRoutes.length > 0) {
          const lineGroupIds = trainTypeRoutes.map((r) => r.trainTypeId);
          const result = await gqlClient.query<{
            lineGroupListStations: Station[];
          }>({
            query: GET_LINE_GROUP_LIST_STATIONS_PRESET,
            variables: { lineGroupIds },
          });
          for (const s of result.data?.lineGroupListStations ?? []) {
            const gid = s.trainType?.groupId;
            if (gid == null) continue;
            const arr = trainTypeStationsMap.get(gid);
            if (arr) {
              arr.push(s);
            } else {
              trainTypeStationsMap.set(gid, [s]);
            }
          }
        }

        setCarouselData(
          routes.map((r, i) => ({
            ...r,
            __k: `${r.id}-${i}`,
            stations: r.hasTrainType
              ? (trainTypeStationsMap.get(r.trainTypeId) ?? [])
              : (lineStationsMap.get(r.lineId) ?? []),
          }))
        );
        prevRoutesKeyRef.current = routesKey;
      } catch (err) {
        console.error(err);
      }
    };
    fetchAsync();
  }, [routes]);

  return { carouselData, routes, isRoutesDBInitialized };
};
