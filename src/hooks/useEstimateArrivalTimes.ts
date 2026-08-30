import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import { toRelativeEtaStops } from '~/utils/relativeEtaStops';
import { leftStationsAtom } from '../store/atoms/navigation';
import { useDisplayCurrentStation } from './useDisplayCurrentStation';
import { useEstimateArrivalTimesRoute } from './useEstimateArrivalTimesRoute';

/**
 * クエリ変数の組み立て・実行・ルート抽出は useEstimateArrivalTimesRoute に委譲し、
 * ここでは表示都合の整形だけを行う薄いラッパー。
 * 返す route.stops は LineBoard に表示中の駅（leftStations）に限定し、
 * 現在駅の到着時刻を基準（0分）とした相対時間に変換する。
 *
 * 全駅ぶんの ETA が要る画面(ポートレート)は leftStations で絞られると大半の駅が
 * 欠けるため、絞り込みを持たない useEstimateArrivalTimesAllStops を使う。
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

    const visibleStationIds = new Set(leftStations.map((ls) => ls.id));

    // 相対値への変換は全 stops を見てから行う。先に leftStations で絞ると、
    // 表示区間の外に出た現在駅を見失って基準が 0 にフォールバックしてしまう。
    const relativeStops = toRelativeEtaStops(
      route.stops ?? [],
      currentStation?.id
    ).filter((s) => s.stationId != null && visibleStationIds.has(s.stationId));

    return { ...route, stops: relativeStops };
  }, [route, leftStations, currentStation?.id]);

  return { route: matchedRoute, loading, error };
};
