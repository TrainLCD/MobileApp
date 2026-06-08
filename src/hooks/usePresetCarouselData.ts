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
  const carouselDataRef = useRef<LoopItem[]>([]);
  const prevFetchKeyRef = useRef('');
  const prevDisplayKeyRef = useRef('');
  const currentRequestIdRef = useRef(0);

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
    const fetchKey = routes
      .map((r) => `${r.id}:${r.lineId}:${r.trainTypeId}:${r.hasTrainType}`)
      .join(',');
    const displayKey = routes
      .map(
        (r) =>
          `${r.id}:${r.lineId}:${r.trainTypeId}:${r.hasTrainType}:${r.name}:${r.direction}:${r.wantedDestinationId}:${r.notifyStationIds.join(';')}`
      )
      .join(',');

    const needsFetch = fetchKey !== prevFetchKeyRef.current;
    const needsDisplayUpdate = displayKey !== prevDisplayKeyRef.current;

    if (!needsFetch && !needsDisplayUpdate) return;

    const requestId = ++currentRequestIdRef.current;
    // 同じ fetchKey で重複 fetch しないよう即座にマーク
    if (needsFetch) {
      prevFetchKeyRef.current = fetchKey;
    }

    const fetchAsync = async () => {
      try {
        const lineStationsMap = new Map<number, Station[]>();
        const trainTypeStationsMap = new Map<number, Station[]>();

        if (needsFetch) {
          const lineRoutes = routes.filter((r) => !r.hasTrainType);
          const trainTypeRoutes = routes.filter((r) => r.hasTrainType);

          // !hasTrainType のルートを lineListStations で一括取得
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

          if (requestId !== currentRequestIdRef.current) return;
        } else {
          // fetch不要の場合は既存のcarouselDataから駅データを再利用
          for (const item of carouselDataRef.current) {
            if (item.hasTrainType) {
              trainTypeStationsMap.set(item.trainTypeId, item.stations);
            } else {
              lineStationsMap.set(item.lineId, item.stations);
            }
          }
        }

        if (requestId !== currentRequestIdRef.current) return;

        const newData = routes.map((r, i) => ({
          ...r,
          __k: `${r.id}-${i}`,
          stations: r.hasTrainType
            ? (trainTypeStationsMap.get(r.trainTypeId) ?? [])
            : (lineStationsMap.get(r.lineId) ?? []),
        }));
        carouselDataRef.current = newData;
        setCarouselData(newData);
        prevDisplayKeyRef.current = displayKey;
      } catch (err) {
        // fetch失敗時はキーをリセットしてリトライ可能にする
        if (needsFetch && requestId === currentRequestIdRef.current) {
          prevFetchKeyRef.current = '';
        }
        console.error(err);
      }
    };
    fetchAsync();
  }, [routes]);

  return { carouselData, routes, isRoutesDBInitialized };
};
