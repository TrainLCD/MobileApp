import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import { leftStationsAtom } from '../store/atoms/navigation';
import { useDisplayCurrentStation } from './useDisplayCurrentStation';
import { useEstimateArrivalTimesRoute } from './useEstimateArrivalTimesRoute';

/**
 * クエリ変数の組み立て・実行・ルート抽出は useEstimateArrivalTimesRoute に委譲し、
 * ここでは表示都合の整形だけを行う薄いラッパー。
 * 返す route.stops は LineBoard に表示中の駅（leftStations）に限定し、
 * 現在駅の到着時刻を基準（0分）とした相対時間に変換する。
 */
export const useEstimateArrivalTimes = (options?: { skip?: boolean }) => {
  const leftStations = useAtomValue(leftStationsAtom);
  // LineBoard 側の passed/グレーアウト判定と同じ基準駅を使うことで、取りこぼし時の
  // 前方補正(healed)が効いた際に基準駅がずれ、出発済み駅にETAが残るのを防ぐ。
  const currentStation = useDisplayCurrentStation();

  const { route, loading, error } = useEstimateArrivalTimesRoute(options);

  // route の stops を LineBoard 表示中の駅（leftStations）だけに絞り込んだ上で、
  // 現在駅の到着時刻を基準（0分）とした相対時間に変換する
  const matchedRoute = useMemo(() => {
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
  }, [route, leftStations, currentStation?.id]);

  return { route: matchedRoute, loading, error };
};
