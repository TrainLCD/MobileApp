import { queryCollectionOptions } from '@tanstack/query-db-collection';
import { createCollection, useLiveQuery } from '@tanstack/react-db';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useId, useMemo } from 'react';
import type { Station } from '~/@types/graphql';
import { gqlRequest, graphqlQueryKey } from '~/lib/gql';
import { GET_STATIONS_NEARBY } from '~/lib/graphql/queries';

type NearbyStationsData = { stationsNearby: Station[] };
type NearbyStationRow = { rank: number; station: Station };

// 同じ座標へ戻る場合も、再生成したコレクションには別の識別子が必要です。
let nextCollectionId = 0;

export const useNearbyStations = ({
  latitude,
  longitude,
  visible,
}: {
  latitude: number | undefined;
  longitude: number | undefined;
  visible: boolean;
}) => {
  const queryClient = useQueryClient();
  const id = useId();
  const enabled = visible && latitude != null && longitude != null;
  const options = useMemo(
    () => ({
      queryKey: graphqlQueryKey(GET_STATIONS_NEARBY, {
        latitude,
        longitude,
        limit: 10,
      }),
      queryFn: () =>
        gqlRequest<NearbyStationsData>(GET_STATIONS_NEARBY, {
          latitude,
          longitude,
          limit: 10,
        }),
    }),
    [latitude, longitude]
  );
  // 通信状態は Query が管理し、DB は同じキャッシュを読み取る。
  // DB 側からの自動取得を止め、モーダルを閉じた後の購読猶予中も通信を始めない。
  const query = useQuery({ ...options, enabled });
  // 初回取得失敗で停止した DB の購読は、Query の復旧時に作り直す。
  const stations = useMemo(
    () =>
      createCollection({
        ...queryCollectionOptions({
          ...options,
          // API は全10件を返すため、DB の購読条件によらず同じ Query を参照する。
          // on-demand は共有 Query をコレクションの解放時に削除しない。
          syncMode: 'on-demand',
          queryKey: () => options.queryKey,
          id: `nearby-stations-${id}-${++nextCollectionId}-${query.isError}`,
          queryClient,
          enabled: false,
          // 駅IDが同じ行も落とさず、API の距離順をそのまま保持する。
          getKey: (row: NearbyStationRow) => row.rank,
          select: (data: NearbyStationsData): NearbyStationRow[] =>
            data.stationsNearby.map((station, rank) => ({ rank, station })),
        }),
        // DB の購読だけを早く解放し、Query のキャッシュ寿命は変更しない。
        gcTime: 1,
      }),
    [options, queryClient, id, query.isError]
  );
  const live = useLiveQuery({
    id: `nearby-stations-view-${id}`,
    query: (q) =>
      enabled
        ? q.from({ nearby: stations }).orderBy(({ nearby }) => nearby.rank)
        : undefined,
  });
  const data = useMemo(
    () =>
      enabled && query.data && live.isReady && live.data
        ? { stationsNearby: live.data.map((row) => row.station) }
        : undefined,
    [enabled, query.data, live.isReady, live.data]
  );

  return {
    data,
    loading: enabled && (query.isFetching || (!!query.data && !live.isReady)),
    error: query.error ?? undefined,
  };
};
