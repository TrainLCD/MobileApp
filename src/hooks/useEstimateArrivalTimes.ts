import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import type {
  EstimateArrivalTimesQuery,
  EstimateArrivalTimesQueryVariables,
} from '~/@types/graphql';
import { ESTIMATE_ARRIVAL_TIMES } from '~/lib/graphql/queries';
import { selectedLineAtom } from '../store/atoms/line';
import { leftStationsAtom } from '../store/atoms/navigation';
import {
  selectedBoundAtom,
  selectedDirectionAtom,
  stationsAtom,
} from '../store/atoms/station';
import { useCurrentTrainType } from './useCurrentTrainType';
import { useDisplayCurrentStation } from './useDisplayCurrentStation';
import { useGraphQLQuery } from './useGraphQLQuery';
import { useLoopLine } from './useLoopLine';

/**
 * 選択中の路線・駅情報から estimateArrivalTimes クエリの変数を組み立て、
 * 現在の種別 (groupId) または選択中の路線 ID に一致するルートを返すフック。
 * 返す route.stops は LineBoard に表示中の駅（leftStations）に限定し、
 * 現在駅の到着時刻を基準（0分）とした相対時間に変換する。
 */
export const useEstimateArrivalTimes = () => {
  const stations = useAtomValue(stationsAtom);
  const selectedBound = useAtomValue(selectedBoundAtom);
  const selectedDirection = useAtomValue(selectedDirectionAtom);
  const selectedLine = useAtomValue(selectedLineAtom);
  const leftStations = useAtomValue(leftStationsAtom);
  // LineBoard 側の passed/グレーアウト判定と同じ基準駅を使うことで、取りこぼし時の
  // 前方補正(healed)が効いた際に基準駅がずれ、出発済み駅にETAが残るのを防ぐ。
  const currentStation = useDisplayCurrentStation();
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
      directionId,
    },
    skip,
  });

  // レスポンスの routes から filteringId に一致するルートを1件取り出し、
  // stops を LineBoard 表示中の駅（leftStations）だけに絞り込んだ上で、
  // 現在駅の到着時刻を基準（0分）とした相対時間に変換する
  const matchedRoute = useMemo(() => {
    const routes = data?.estimateArrivalTimes?.routes;
    if (!routes || filteringId == null) {
      return null;
    }

    const route = routes.find((r) => r.id === filteringId) ?? null;
    if (!route) {
      return null;
    }

    const allStops = route.stops ?? [];

    // 大江戸線の都庁前のように、環状区間(6の字運転)では同じ駅が全stops中に
    // 複数回出現する。ただしこれらは stationGroupId(同一駅を束ねる論理グループ)
    // こそ共通だが、stationId は出現ごとに別々に採番されている(例: 都庁前の
    // 外回り/内回りはそれぞれ別の stationId を持つ)。そのため stationGroupId
    // で突き合わせると無関係な出現まで拾ってしまうが、stationId なら出現ごとに
    // 一意なので誤って混同することがない。
    const baseMinutes =
      allStops.find((s) => s.stationId === currentStation?.id)
        ?.departureCumulativeMinutes ?? 0;

    const visibleStationIds = new Set(leftStations.map((ls) => ls.id));

    // 現在駅自身は cumulativeMinutes - baseMinutes が0以下になり通常は下のfilterで
    // 除外されるが、区間内に現在駅のエントリが見つからずbaseMinutesが0に
    // フォールバックするケースでは生の値が残ってしまう。停車中の駅にはETAを出さない
    // という表示上の不変条件を計算結果に依存せず保証するため、ここで明示的に除く。
    const relativeStops = allStops
      .filter(
        (s) =>
          s.stationId != null &&
          visibleStationIds.has(s.stationId) &&
          s.stationId !== currentStation?.id
      )
      .map((s) => ({
        ...s,
        cumulativeMinutes:
          s.cumulativeMinutes == null
            ? null
            : s.cumulativeMinutes - baseMinutes,
      }))
      .filter((s) => s.cumulativeMinutes == null || s.cumulativeMinutes > 0);

    return { ...route, stops: relativeStops };
  }, [data, filteringId, leftStations, currentStation?.id]);

  return { route: matchedRoute, loading, error };
};
