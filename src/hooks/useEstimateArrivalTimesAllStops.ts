import { useMemo } from 'react';
import { toRelativeEtaStops } from '~/utils/relativeEtaStops';
import { useDisplayCurrentStation } from './useDisplayCurrentStation';
import { useEstimateArrivalTimesRoute } from './useEstimateArrivalTimesRoute';

/**
 * useEstimateArrivalTimes と同じ相対時間への変換を、leftStations による絞り込み
 * 抜きで行う。ポートレートは路線の全駅を出すため、横画面 LineBoard の表示都合で
 * 絞られた stops では画面に出ている駅の大半で ETA が欠ける。
 *
 * 絞り込みを useEstimateArrivalTimes 側から外して共用すると LineBoard の表示条件が
 * 変わってしまうので、共通する変換だけを toRelativeEtaStops に切り出したうえで
 * フックは分けている。
 */
export const useEstimateArrivalTimesAllStops = (options?: {
  skip?: boolean;
}) => {
  // 基準駅は useEstimateArrivalTimes と揃える。GPS の取りこぼしを前方補正した
  // ときに基準がずれて、発車済みの駅に ETA が残るのを防ぐ。
  const currentStation = useDisplayCurrentStation();

  const { route, loading, error } = useEstimateArrivalTimesRoute(options);

  const matchedRoute = useMemo(() => {
    if (!route) {
      return null;
    }

    return {
      ...route,
      stops: toRelativeEtaStops(route.stops ?? [], currentStation?.id),
    };
  }, [route, currentStation?.id]);

  return { route: matchedRoute, loading, error };
};
