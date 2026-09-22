import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import type {
  EstimateArrivalTimesQuery,
  EstimateArrivalTimesQueryVariables,
} from '~/@types/graphql';
import {
  ESTIMATE_ARRIVAL_TIMES,
  ESTIMATE_CONNECTED_ROUTE_ARRIVAL_TIMES,
} from '~/lib/graphql/queries';
import {
  buildRouteLegInputs,
  getCurrentLineGroupStations,
  type RouteLegInput,
} from '~/utils/currentLineGroupStations';
import { selectedLineAtom } from '../store/atoms/line';
import {
  selectedBoundAtom,
  selectedDirectionAtom,
  stationsAtom,
} from '../store/atoms/station';
import { useCurrentStation } from './useCurrentStation';
import { useCurrentTrainType } from './useCurrentTrainType';
import { useGraphQLQuery } from './useGraphQLQuery';
import { useLoopLine } from './useLoopLine';

type EstimateConnectedRouteArrivalTimesVariables = {
  fromStationId: number;
  toStationId: number;
  legs: RouteLegInput[];
};

/**
 * 選択中の路線・駅情報から estimateArrivalTimes クエリの変数を組み立て、
 * 現在の種別 (groupId) または選択中の路線 ID に一致するルートを1件返すフック。
 * 返す route.stops は絶対値の cumulativeMinutes / departureCumulativeMinutes を
 * 持つ全 stops のまま返す(相対時間への変換・leftStations による絞り込み・
 * 現在駅の除外は行わない)。それらは表示都合の整形であり、呼び出し側
 * (useEstimateArrivalTimes)の責務とする。
 */
export const useEstimateArrivalTimesRoute = (options?: { skip?: boolean }) => {
  const allStations = useAtomValue(stationsAtom);
  const selectedBound = useAtomValue(selectedBoundAtom);
  const selectedDirection = useAtomValue(selectedDirectionAtom);
  const selectedLine = useAtomValue(selectedLineAtom);
  const trainType = useCurrentTrainType();
  const currentStation = useCurrentStation();
  const { isLoopLine } = useLoopLine();

  // 経路検索の乗換経路は系統ごとの駅をつないだ駅リストになっている。先頭から末尾へ
  // 進むときは区間(legs)を渡して経路全体を 1 本として推定させる
  const routeLegs = useMemo(
    () =>
      selectedDirection === 'INBOUND' ? buildRouteLegInputs(allStations) : null,
    [allStations, selectedDirection]
  );

  // legs を組み立てられない乗換経路では、推定は 1 系統の中でしか返らないので、
  // 現在乗っている系統の範囲だけを問い合わせる。1 系統だけの駅リストではそのまま全駅を使う
  const { groupId: currentLineGroupId, stations } = useMemo(
    () => getCurrentLineGroupStations(allStations, currentStation),
    [allStations, currentStation]
  );
  const isJoinedRoute = stations !== allStations;

  // stations 配列は [上り方面の終点, ..., 下り方面の終点] の順。
  // 線形路線では OUTBOUND は末尾→先頭方向、INBOUND は先頭→末尾方向に進むので from/to を入れ替える。
  // 環状路線は進行方向の規約が線形と逆 (INBOUND=配列逆順・OUTBOUND=格納順) なので、
  // from/to も進行方向の始端→終端になるよう逆に割り当てる。こうしないと directionId で
  // 指定した向きの弧が from→to の全周区間ではなく継ぎ目を跨いだ2駅分に潰れてしまう。
  const travelsInStoredOrder = isLoopLine
    ? selectedDirection === 'OUTBOUND'
    : selectedDirection === 'INBOUND';
  const fromStationId = travelsInStoredOrder
    ? stations[0]?.id
    : stations.at(-1)?.id;
  const toStationId = travelsInStoredOrder
    ? stations.at(-1)?.id
    : stations[0]?.id;

  // 経由路線ID: stations に含まれる全路線IDを重複排除して渡す
  const viaLineIds = useMemo(
    () => [
      ...new Set(
        stations.map((s) => s.line?.id).filter((id): id is number => id != null)
      ),
    ],
    [stations]
  );

  // routes.id は種別選択時は trainType.groupId、未選択時は路線IDに対応する。
  // 乗換経路では今乗っている範囲の系統で引く
  const filteringId =
    (isJoinedRoute ? currentLineGroupId : null) ??
    trainType?.groupId ??
    selectedLine?.id;

  // StationAPI EstimateArrivalTimesRequest.direction_id (0 = 格納順, 1 = 逆順) に対応。
  // 環状路線は from/to 駅だけでは周回方向が一意に定まらず、directionId 未指定だと
  // バックエンドは直線距離が短い方の弧を選ぶヒューリスティックにフォールバックする
  // (TrainLCD/StationAPI#1581)。この曖昧さは環状路線に限らないため、路線種別を問わず
  // 進行方向が判明していれば常に directionId を明示的に指定する。travelsInStoredOrder は
  // 路線種別ごとの進行方向規約を織り込み済みなので、そのまま 格納順=0 / 逆順=1 に
  // 変換すればよい。undefined はシリアライズ時に落ちるので方面未選択時は送信されない。
  // 乗換経路の範囲はアプリ側で並べ替えてつないでおり、API 側の格納順とは向きが
  // 一致するとは限らない。線形の路線では directionId が無くても from→to で推定され、
  // 環状線では短い弧が選ばれる(範囲を切り出すときも短い弧を選んでいる)ので渡さない
  const directionId =
    selectedDirection != null && !isJoinedRoute
      ? travelsInStoredOrder
        ? 0
        : 1
      : undefined;

  // 呼び出し側がETA不要な場合・方面未選択・始発/終着が不明・フィルタ先が無い場合はクエリを実行しない
  const skip =
    !!options?.skip ||
    !selectedBound ||
    !!routeLegs ||
    fromStationId == null ||
    toStationId == null ||
    filteringId == null;
  const connectedSkip = !!options?.skip || !selectedBound || !routeLegs;

  const { data, loading, error } = useGraphQLQuery<
    EstimateArrivalTimesQuery,
    EstimateArrivalTimesQueryVariables
  >(ESTIMATE_ARRIVAL_TIMES, {
    variables: {
      fromStationId: fromStationId ?? 0,
      toStationId: toStationId ?? 0,
      viaLineIds,
      directionId,
    },
    skip,
  });

  // 区間を渡した推定は、系統をまたぐ 1 本の経路(id は null)だけを返す
  const {
    data: connectedData,
    loading: connectedLoading,
    error: connectedError,
  } = useGraphQLQuery<
    EstimateArrivalTimesQuery,
    EstimateConnectedRouteArrivalTimesVariables
  >(ESTIMATE_CONNECTED_ROUTE_ARRIVAL_TIMES, {
    variables: {
      fromStationId: routeLegs?.[0]?.fromStationId ?? 0,
      toStationId: routeLegs?.at(-1)?.toStationId ?? 0,
      legs: routeLegs ?? [],
    },
    skip: connectedSkip,
  });

  // レスポンスの routes から filteringId に一致するルートを1件取り出す。
  // stops の絞り込み・相対時間変換は呼び出し側の責務。
  const matchedRoute = useMemo(() => {
    // skip時でも同一queryKeyのキャッシュがあるとdataは返ってくる(enabledはfetch抑止のみ)
    // ため、ルートを返さないことをここで保証する
    if (routeLegs) {
      return connectedSkip
        ? null
        : (connectedData?.estimateArrivalTimes?.routes?.[0] ?? null);
    }
    if (skip) {
      return null;
    }
    const routes = data?.estimateArrivalTimes?.routes;
    if (!routes || filteringId == null) {
      return null;
    }

    return routes.find((r) => r.id === filteringId) ?? null;
  }, [data, filteringId, skip, routeLegs, connectedData, connectedSkip]);

  return routeLegs
    ? { route: matchedRoute, loading: connectedLoading, error: connectedError }
    : { route: matchedRoute, loading, error };
};
