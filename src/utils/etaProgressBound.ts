import getDistance from 'geolib/es/getDistance';
import type { Station } from '~/@types/graphql';

/**
 * ETA仮想時計が示す進行状況から見て、届いた測位が「そこまで進んでいるはずがない」位置かを
 * 判定する純関数。
 *
 * ETAは駅間距離と車両性能から算出される(StationAPIのTrainRouteSegmentが
 * distanceFromPrevious / maxSpeed / maxAcceleration / maxDeceleration を持つ)ため、
 * 「どこにいるか」より「どこまでは進めないか」の方が信頼できる。遅延も停車時間の伸びも
 * 列車を遅くする方向にしか働かないので、上限としては破られない。
 *
 * 位置を進めるためには使わない。ETAが位置・到着・接近を駆動しない方針(#6369)は維持し、
 * ここでの用途は棄却のみ。ETAが誤っていても、位置が据え置かれる以上の影響は出ない。
 */
export const isBeyondEtaProgress = ({
  stations,
  anchorStationId,
  targetStationId,
  latitude,
  longitude,
  toleranceStations,
}: {
  stations: Station[];
  anchorStationId: number;
  targetStationId: number;
  latitude: number;
  longitude: number;
  toleranceStations: number;
}): boolean => {
  const anchorIdx = stations.findIndex((s) => s.id === anchorStationId);
  const targetIdx = stations.findIndex((s) => s.id === targetStationId);
  if (anchorIdx === -1 || targetIdx === -1) {
    return false;
  }

  let fixIdx = -1;
  let bestDistance = Number.POSITIVE_INFINITY;
  stations.forEach((s, i) => {
    const lat = s.latitude;
    const lon = s.longitude;
    if (lat == null || lon == null) {
      return;
    }
    const d = getDistance(
      { latitude: lat, longitude: lon },
      { latitude, longitude }
    );
    if (d < bestDistance) {
      bestDistance = d;
      fixIdx = i;
    }
  });
  if (fixIdx === -1) {
    return false;
  }

  // 進行方向はETA側の並び(アンカー→対象駅)から決める。
  const direction = Math.sign(targetIdx - anchorIdx);
  if (direction === 0) {
    // アンカー駅で停車中の推定。前後どちらへもtolerance以上離れていたら説明できない。
    return Math.abs(fixIdx - anchorIdx) > toleranceStations;
  }

  const progress = (fixIdx - anchorIdx) * direction;
  const limit = (targetIdx - anchorIdx) * direction + toleranceStations;
  return progress > limit || progress < -toleranceStations;
};
