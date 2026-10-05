/**
 * 振り返り機能(#5751)の乗車時間を補う、ETA 上の所要時間を求める。
 *
 * 駅の検出で測る乗車時間は、出発駅の到着圏を出てから最後の駅の到着圏に入るまでで、
 * 発車直後と停車直前の時間が抜ける。駅間が短いほど短く出るため、StationAPI の
 * estimateArrivalTimes が駅間距離と車両性能から求めた所要時間を下限に使う。
 */

// estimateArrivalTimes の stops の1件。累積分は経路の始点からの絶対値
export type RideEtaStop = {
  stationId?: number | null;
  stationGroupId?: number | null;
  cumulativeMinutes?: number | null;
  departureCumulativeMinutes?: number | null;
};

// ETA の起点にする記録済みの駅
export type RideEtaAnchor = {
  stationId: number;
  stationGroupId: number | null;
  // 乗車の出発駅なら、到着ではなく発車の時刻から数える
  isOrigin: boolean;
};

// 接続駅は前後の路線で駅 ID が変わるので、ID で見つからなければ駅グループで探す
const findStop = (
  stops: readonly RideEtaStop[],
  stationId: number,
  stationGroupId: number | null
): RideEtaStop | undefined =>
  stops.find((s) => s.stationId === stationId) ??
  (stationGroupId != null
    ? stops.find((s) => s.stationGroupId === stationGroupId)
    : undefined);

/**
 * anchor から station までの ETA 上の所要時間(分)。どちらかが経路に無い、時刻が無い、
 * 経路の向きと逆になるときは null。
 */
export const estimateRideEtaMinutes = (
  stops: readonly RideEtaStop[] | null | undefined,
  anchor: RideEtaAnchor,
  station: { stationId: number; stationGroupId: number | null }
): number | null => {
  if (!stops?.length) {
    return null;
  }
  const from = findStop(stops, anchor.stationId, anchor.stationGroupId);
  const to = findStop(stops, station.stationId, station.stationGroupId);
  if (!from || !to || from === to) {
    return null;
  }
  const fromMinutes = anchor.isOrigin
    ? (from.departureCumulativeMinutes ?? from.cumulativeMinutes)
    : from.cumulativeMinutes;
  const toMinutes = to.cumulativeMinutes;
  if (fromMinutes == null || toMinutes == null || toMinutes < fromMinutes) {
    return null;
  }
  return toMinutes - fromMinutes;
};
