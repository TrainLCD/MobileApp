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
  const prevFetchKeyRef = useRef('');
  const prevDisplayKeyRef = useRef('');
  const currentRequestIdRef = useRef(0);
  // 進行中の取得対象。同じ対象の取得を二重に発行しないために保持する
  const inFlightFetchKeyRef = useRef<string | null>(null);
  // 取得完了時は常に最新の routes で表示を組み立てる。
  // effect のクロージャに閉じ込めると、取得中に routes が変わった場合に
  // 古い表示内容で確定してしまう
  const latestRoutesRef = useRef<{ routes: SavedRoute[]; displayKey: string }>({
    routes: [],
    displayKey: '',
  });
  // 取得済みの駅データは路線ID / 種別(lineGroup)IDをキーに保持する。
  // carouselData から引き当てる方式だと、取得完了前に routes が作り直された際に
  // まだ駅を持たないプリセットが空配列で確定してしまう
  const lineStationsCacheRef = useRef(new Map<number, Station[]>());
  const trainTypeStationsCacheRef = useRef(new Map<number, Station[]>());

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

    latestRoutesRef.current = { routes, displayKey };

    const lineStationsCache = lineStationsCacheRef.current;
    const trainTypeStationsCache = trainTypeStationsCacheRef.current;

    // 駅データが未取得のプリセットが1件でもあれば取得する。
    // fetchKey の一致だけで判断すると、取得が完了していない段階でも
    // 「取得済み」とみなして空配列のまま確定してしまう
    const hasAllStations = routes.every((r) =>
      r.hasTrainType
        ? trainTypeStationsCache.has(r.trainTypeId)
        : lineStationsCache.has(r.lineId)
    );

    // 同じ対象の取得が既に走っている場合は再発行しない。
    // 未取得判定(hasAllStations)は取得完了まで false のままなので、
    // これが無いと routes が作り直されるたびに取得をやり直してしまう
    const isFetchingSameKey = inFlightFetchKeyRef.current === fetchKey;
    const needsFetch =
      !isFetchingSameKey &&
      (fetchKey !== prevFetchKeyRef.current || !hasAllStations);
    const needsDisplayUpdate = displayKey !== prevDisplayKeyRef.current;

    if (!needsFetch && !needsDisplayUpdate) return;

    // 表示は常に最新の routes から組み立てる
    const applyRoutes = () => {
      const { routes: latestRoutes, displayKey: latestDisplayKey } =
        latestRoutesRef.current;
      const newData = latestRoutes.map((r, i) => ({
        ...r,
        __k: `${r.id}-${i}`,
        stations:
          (r.hasTrainType
            ? trainTypeStationsCache.get(r.trainTypeId)
            : lineStationsCache.get(r.lineId)) ?? [],
      }));
      setCarouselData(newData);
      prevDisplayKeyRef.current = latestDisplayKey;
    };

    if (!needsFetch) {
      // 進行中の取得と同じ対象なら、その完了時に最新 routes で反映される
      if (isFetchingSameKey) return;
      // 表示項目だけの更新。進行中の取得を打ち切らないよう requestId は進めない
      applyRoutes();
      return;
    }

    const requestId = ++currentRequestIdRef.current;
    // 同じ fetchKey で重複 fetch しないよう即座にマーク
    prevFetchKeyRef.current = fetchKey;
    inFlightFetchKeyRef.current = fetchKey;

    const fetchAsync = async () => {
      try {
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
          // 追い越された古い応答で共有キャッシュを汚さない
          if (requestId !== currentRequestIdRef.current) return;
          const fetched = new Map<number, Station[]>();
          for (const s of result.data?.lineListStations ?? []) {
            const lid = s.line?.id;
            if (lid == null) continue;
            const arr = fetched.get(lid);
            if (arr) {
              arr.push(s);
            } else {
              fetched.set(lid, [s]);
            }
          }
          // 応答に含まれなかった路線も取得済みとして記録し、再取得を繰り返さないようにする
          for (const lineId of lineIds) {
            lineStationsCache.set(lineId, fetched.get(lineId) ?? []);
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
          // 追い越された古い応答で共有キャッシュを汚さない
          if (requestId !== currentRequestIdRef.current) return;
          const fetched = new Map<number, Station[]>();
          for (const s of result.data?.lineGroupListStations ?? []) {
            const gid = s.trainType?.groupId;
            if (gid == null) continue;
            const arr = fetched.get(gid);
            if (arr) {
              arr.push(s);
            } else {
              fetched.set(gid, [s]);
            }
          }
          for (const groupId of lineGroupIds) {
            trainTypeStationsCache.set(groupId, fetched.get(groupId) ?? []);
          }
        }

        if (requestId !== currentRequestIdRef.current) return;

        applyRoutes();
      } catch (err) {
        // fetch失敗時はキーをリセットしてリトライ可能にする
        if (requestId === currentRequestIdRef.current) {
          prevFetchKeyRef.current = '';
        }
        console.error(err);
      } finally {
        // 追い越された古いリクエストが、進行中の新しい取得の印を消さないようにする
        if (requestId === currentRequestIdRef.current) {
          inFlightFetchKeyRef.current = null;
        }
      }
    };
    fetchAsync();
  }, [routes]);

  return { carouselData, routes, isRoutesDBInitialized };
};
