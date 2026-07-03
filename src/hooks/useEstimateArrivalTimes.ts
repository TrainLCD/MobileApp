import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import type {
  EstimateArrivalTimesQuery,
  EstimateArrivalTimesQueryVariables,
} from '~/@types/graphql';
import { ESTIMATE_ARRIVAL_TIMES } from '~/lib/graphql/queries';
import type { LineDirection } from '../models/Bound';
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

// StationAPI EstimateArrivalTimesRequest.direction_id (0 = 格納順, 1 = 逆順) に対応。
// stations 配列は API の格納順なので、先頭→末尾に進む INBOUND が 0、逆の OUTBOUND が 1。
const LOOP_LINE_DIRECTION_ID: Record<LineDirection, number> = {
  INBOUND: 0,
  OUTBOUND: 1,
};

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

  // 環状路線は from/to 駅だけでは周回方向が一意に定まらず、directionId 未指定だと
  // バックエンドは直線距離が短い方の弧を選ぶヒューリスティックにフォールバックする
  // (TrainLCD/StationAPI#1581)。逆回り方向の ETA が返るのを防ぐため、環状路線の
  // ときだけ進行方向を明示的に指定する。undefined はシリアライズ時に落ちるので送信されない。
  const directionId =
    isLoopLine && selectedDirection != null
      ? LOOP_LINE_DIRECTION_ID[selectedDirection]
      : undefined;

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

    // 大江戸線の都庁前のように、環状区間で同じ駅が全stops中に複数回
    // 出現することがある（例: 新宿→光が丘は都庁前を1回だけ通るはずだが、
    // 環状部分を含む都庁前は他の時点でも別途出現する）。
    // 単純な find() / filter() だと現在地と無関係な出現（別時点の都庁前）を
    // 拾ってしまうため、leftStations の並び順をそのまま部分列として
    // 辿れる区間を stops 内から探す。開始位置の候補が複数ある場合は、
    // 最も範囲が短い（＝現在地に最も近い）候補を採用する。
    const firstGroupId = leftStations[0]?.groupId;
    let windowStartIndex = -1;
    let windowEndIndex = -1;
    let bestSpan = Number.POSITIVE_INFINITY;
    if (firstGroupId != null) {
      outer: for (let i = 0; i < allStops.length; i++) {
        if (allStops[i]?.stationGroupId !== firstGroupId) {
          continue;
        }
        let cursor = i;
        for (const ls of leftStations) {
          while (
            cursor < allStops.length &&
            allStops[cursor]?.stationGroupId !== ls.groupId
          ) {
            cursor++;
          }
          if (cursor >= allStops.length) {
            continue outer;
          }
          cursor++;
        }
        const span = cursor - i;
        if (span < bestSpan) {
          bestSpan = span;
          windowStartIndex = i;
          windowEndIndex = cursor;
        }
      }
    }

    const windowStops =
      windowStartIndex !== -1
        ? allStops.slice(windowStartIndex, windowEndIndex)
        : allStops;
    // 特定した区間内で現在駅の出発時刻を探し、基準（0分）として使う。
    // 停車時間がある駅では到着時刻ではなく出発時刻を基準にしないと、
    // 停車中に後続駅のETAがズレて表示されてしまう。
    // 区間内に現在駅が見つからない場合はオフセットせず生の値を返す。
    const baseMinutes =
      windowStops.find((s) => s.stationGroupId === currentStation?.groupId)
        ?.departureCumulativeMinutes ?? 0;

    const visibleGroupIds = new Set(leftStations.map((s) => s.groupId));
    // 現在駅自身は cumulativeMinutes - baseMinutes が0以下になり通常は下のfilterで
    // 除外されるが、windowStops内に現在駅のエントリが見つからずbaseMinutesが0に
    // フォールバックするケースでは生の値が残ってしまう。停車中の駅にはETAを出さない
    // という表示上の不変条件を計算結果に依存せず保証するため、ここで明示的に除く。
    const relativeStops = windowStops
      .filter(
        (s) =>
          s.stationGroupId != null &&
          visibleGroupIds.has(s.stationGroupId) &&
          s.stationGroupId !== currentStation?.groupId
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
  }, [data, filteringId, leftStations, currentStation?.groupId]);

  return { route: matchedRoute, loading, error };
};
