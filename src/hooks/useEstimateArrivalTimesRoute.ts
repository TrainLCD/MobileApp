import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import type {
  EstimateArrivalTimesQuery,
  EstimateArrivalTimesQueryVariables,
} from '~/@types/graphql';
import { ESTIMATE_ARRIVAL_TIMES } from '~/lib/graphql/queries';
import { selectedLineAtom } from '../store/atoms/line';
import {
  selectedBoundAtom,
  selectedDirectionAtom,
  stationsAtom,
} from '../store/atoms/station';
import { useCurrentTrainType } from './useCurrentTrainType';
import { useGraphQLQuery } from './useGraphQLQuery';
import { useLoopLine } from './useLoopLine';

/**
 * 選択中の路線・駅情報から estimateArrivalTimes クエリの変数を組み立て、
 * 現在の種別 (groupId) または選択中の路線 ID に一致するルートを1件返すフック。
 * 返す route.stops は絶対値の cumulativeMinutes / departureCumulativeMinutes を
 * 持つ全 stops のまま返す(相対時間への変換・leftStations による絞り込み・
 * 現在駅の除外は行わない)。それらは表示都合の整形であり、呼び出し側
 * (useEstimateArrivalTimes)の責務とする。
 */
export const useEstimateArrivalTimesRoute = (options?: { skip?: boolean }) => {
  const stations = useAtomValue(stationsAtom);
  const selectedBound = useAtomValue(selectedBoundAtom);
  const selectedDirection = useAtomValue(selectedDirectionAtom);
  const selectedLine = useAtomValue(selectedLineAtom);
  const trainType = useCurrentTrainType();
  const { isLoopLine } = useLoopLine();

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

  // routes.id は種別選択時は trainType.groupId、未選択時は路線IDに対応する
  const filteringId = trainType?.groupId ?? selectedLine?.id;

  // StationAPI EstimateArrivalTimesRequest.direction_id (0 = 格納順, 1 = 逆順) に対応。
  // 環状路線は from/to 駅だけでは周回方向が一意に定まらず、directionId 未指定だと
  // バックエンドは直線距離が短い方の弧を選ぶヒューリスティックにフォールバックする
  // (TrainLCD/StationAPI#1581)。この曖昧さは環状路線に限らないため、路線種別を問わず
  // 進行方向が判明していれば常に directionId を明示的に指定する。travelsInStoredOrder は
  // 路線種別ごとの進行方向規約を織り込み済みなので、そのまま 格納順=0 / 逆順=1 に
  // 変換すればよい。undefined はシリアライズ時に落ちるので方面未選択時は送信されない。
  const directionId =
    selectedDirection != null ? (travelsInStoredOrder ? 0 : 1) : undefined;

  // 呼び出し側がETA不要な場合・方面未選択・始発/終着が不明・フィルタ先が無い場合はクエリを実行しない
  const skip =
    !!options?.skip ||
    !selectedBound ||
    fromStationId == null ||
    toStationId == null ||
    filteringId == null;

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

  // レスポンスの routes から filteringId に一致するルートを1件取り出す。
  // stops の絞り込み・相対時間変換は呼び出し側の責務。
  const matchedRoute = useMemo(() => {
    // skip時でも同一queryKeyのキャッシュがあるとdataは返ってくる(enabledはfetch抑止のみ)
    // ため、ルートを返さないことをここで保証する
    if (skip) {
      return null;
    }
    const routes = data?.estimateArrivalTimes?.routes;
    if (!routes || filteringId == null) {
      return null;
    }

    return routes.find((r) => r.id === filteringId) ?? null;
  }, [data, filteringId, skip]);

  return { route: matchedRoute, loading, error };
};
