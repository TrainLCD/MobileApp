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
    // leftStations の各要素が allStops 中のどのインデックスに一致したかを、
    // 最良区間の分だけ記録する。区間の再フィルタではなく、この一致インデックスを
    // 直接使うことで、環状区間内に紛れ込む無関係な重複出現(下記コメント参照)を
    // relativeStops に混入させない。
    let bestMatchedIndices: number[] = [];
    if (firstGroupId != null) {
      outer: for (let i = 0; i < allStops.length; i++) {
        if (allStops[i]?.stationGroupId !== firstGroupId) {
          continue;
        }
        let cursor = i;
        const matchedIndices: number[] = [];
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
          matchedIndices.push(cursor);
          cursor++;
        }
        const span = cursor - i;
        if (span < bestSpan) {
          bestSpan = span;
          windowStartIndex = i;
          windowEndIndex = cursor;
          bestMatchedIndices = matchedIndices;
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
    // windowStops[0] は firstGroupId(= leftStations[0]) との一致地点なので、
    // currentStation が leftStations[0] と同じ駅である限りこの find() は
    // 必ず windowStops[0] で短絡し、区間内の後続の重複出現を拾わない。
    const baseMinutes =
      windowStops.find((s) => s.stationGroupId === currentStation?.groupId)
        ?.departureCumulativeMinutes ?? 0;

    // 大江戸線の都庁前のように、環状区間で同じ駅が全stops中に複数回出現する場合、
    // windowStops を stationGroupId の集合一致で再フィルタすると、leftStationsの
    // 特定の1要素に対応しない無関係な重複出現まで relativeStops に含まれてしまい、
    // 後段の Map化(stationGroupId をキーにする)で後勝ちの誤ったETAが表示される
    // (例: 都庁前だけ本来より遥かに大きい分数になる)。
    // そのため区間全体を再フィルタするのではなく、leftStations の各要素に対して
    // 一意に特定できた allStops 上のインデックス(bestMatchedIndices)だけを使う。
    const matchedStops =
      windowStartIndex !== -1
        ? bestMatchedIndices.map((idx) => allStops[idx])
        : windowStops.filter((s) => {
            const visibleGroupIds = new Set(
              leftStations.map((ls) => ls.groupId)
            );
            return (
              s.stationGroupId != null && visibleGroupIds.has(s.stationGroupId)
            );
          });

    // 現在駅自身は cumulativeMinutes - baseMinutes が0以下になり通常は下のfilterで
    // 除外されるが、windowStops内に現在駅のエントリが見つからずbaseMinutesが0に
    // フォールバックするケースでは生の値が残ってしまう。停車中の駅にはETAを出さない
    // という表示上の不変条件を計算結果に依存せず保証するため、ここで明示的に除く。
    const relativeStops = matchedStops
      .filter(
        (s) =>
          s.stationGroupId != null &&
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
