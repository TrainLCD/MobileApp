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

/**
 * 選択中の路線・駅情報から estimateArrivalTimes クエリの変数を組み立て、
 * 現在の種別 (groupId) または選択中の路線 ID に一致するルートを返すフック。
 */
export const useEstimateArrivalTimes = () => {
  const stations = useAtomValue(stationsAtom);
  const selectedBound = useAtomValue(selectedBoundAtom);
  const selectedDirection = useAtomValue(selectedDirectionAtom);
  const selectedLine = useAtomValue(selectedLineAtom);
  const trainType = useCurrentTrainType();

  // stations 配列は [上り方面の終点, ..., 下り方面の終点] の順。
  // OUTBOUND は末尾→先頭方向、INBOUND は先頭→末尾方向に進むので from/to を入れ替える。
  const fromStationId =
    selectedDirection === 'OUTBOUND' ? stations.at(-1)?.id : stations[0]?.id;
  const toStationId =
    selectedDirection === 'OUTBOUND' ? stations[0]?.id : stations.at(-1)?.id;

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

  // 方面未選択・始発/終着が不明・フィルタ先が無い場合はクエリを実行しない
  const skip =
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
    },
    skip,
  });

  // レスポンスの routes から filteringId に一致するルートを1件取り出す
  const matchedRoute = useMemo(() => {
    const routes = data?.estimateArrivalTimes?.routes;
    if (!routes || filteringId == null) {
      return null;
    }

    return routes.find((r) => r.id === filteringId) ?? null;
  }, [data, filteringId]);

  return { route: matchedRoute, loading, error };
};
