import { useAtomValue } from 'jotai';
import { useCallback, useMemo, useRef, useState } from 'react';
import type { TrainType } from '~/@types/graphql';
import { GET_CONNECTED_ROUTES_SORTED } from '~/lib/graphql/queries';
import {
  type ConnectedRoutesSource,
  type ConnectedRoutesVariables,
  connectedRoutesSourceAtom,
} from '~/store/atoms/routeSearch';
import {
  type ConnectedRoute,
  type ConnectedRouteSort,
  filterRideableRoutes,
  sortRouteTrainTypeIndices,
} from '~/utils/routeSearch';
import { useLazyGraphQLQuery } from './useLazyGraphQLQuery';

type GetConnectedRoutesSortedData = {
  connectedRoutes: ConnectedRoute[];
};

type GetConnectedRoutesSortedVariables = ConnectedRoutesVariables & {
  sortBy: ConnectedRouteSort;
};

type SortedRoutes = {
  source: ConnectedRoutesSource;
  sort: ConnectedRouteSort;
  routes: ConnectedRoute[];
};

export type UseRouteTrainTypeSortResult = {
  /** 経路検索の結果を並べているか。駅の種別一覧では並べ替えを出さない */
  sortable: boolean;
  sort: ConnectedRouteSort;
  /** 表示順に並べた trainTypes の添字。おすすめ順と取得前は null(並びを変えない) */
  order: number[] | null;
  loading: boolean;
  /** 並べ替えた経路を取れず、おすすめ順に戻したとき */
  error: boolean;
  changeSort: (sort: ConnectedRouteSort) => Promise<void>;
  resetSort: () => void;
};

/**
 * 種別一覧の並び替え。到着の早さと乗換の回数は API が返さないので、並び順を指定して
 * 経路を取り直し、その順に今の種別を並べ直す。返る経路の集合は並び順によらず同じ
 * @param trainTypes 種別一覧に並べている fetchedTrainTypes
 */
export const useRouteTrainTypeSort = (
  trainTypes: TrainType[]
): UseRouteTrainTypeSortResult => {
  const source = useAtomValue(connectedRoutesSourceAtom);
  const activeSource = source?.trainTypes === trainTypes ? source : null;
  // 経路が 1 つだけなら、どの並び順でも同じ並びになる
  const sortable = !!activeSource && activeSource.routes.length > 1;

  const [sort, setSort] = useState<ConnectedRouteSort>('Recommended');
  const [sorted, setSorted] = useState<SortedRoutes | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  // 後から選んだ並び順より先に、前の並び順の結果が届くことがある
  const latestRequestIdRef = useRef(0);

  const [fetchSortedRoutes] = useLazyGraphQLQuery<
    GetConnectedRoutesSortedData,
    GetConnectedRoutesSortedVariables
  >(GET_CONNECTED_ROUTES_SORTED);

  const changeSort = useCallback(
    async (next: ConnectedRouteSort) => {
      const requestId = ++latestRequestIdRef.current;
      setSort(next);
      setError(false);
      if (next === 'Recommended' || !activeSource) {
        setLoading(false);
        return;
      }
      if (sorted?.source === activeSource && sorted.sort === next) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const result = await fetchSortedRoutes({
        variables: { ...activeSource.variables, sortBy: next },
      });
      if (requestId !== latestRequestIdRef.current) return;
      setLoading(false);
      if (result.error || !result.data) {
        // 並び順を知らない API(本番への反映前など)でも一覧は使えるよう、おすすめ順に戻す
        setSort('Recommended');
        setError(true);
        return;
      }
      setSorted({
        source: activeSource,
        sort: next,
        routes: result.data.connectedRoutes ?? [],
      });
    },
    [activeSource, sorted, fetchSortedRoutes]
  );

  const resetSort = useCallback(() => {
    latestRequestIdRef.current += 1;
    setSort('Recommended');
    setLoading(false);
    setError(false);
  }, []);

  const order = useMemo(() => {
    if (
      !activeSource ||
      sort === 'Recommended' ||
      sorted?.source !== activeSource ||
      sorted.sort !== sort
    ) {
      return null;
    }
    return sortRouteTrainTypeIndices(
      activeSource.trainTypes,
      activeSource.routes,
      filterRideableRoutes(sorted.routes)
    );
  }, [activeSource, sort, sorted]);

  return {
    sortable,
    sort,
    order,
    loading,
    error,
    changeSort,
    resetSort,
  };
};
