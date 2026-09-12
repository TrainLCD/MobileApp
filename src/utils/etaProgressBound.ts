import getDistance from 'geolib/es/getDistance';
import type { Station } from '~/@types/graphql';

/**
 * indexから direction 方向へ「停車駅」を count 個ぶん進んだindexを返す。
 *
 * その方向に停車駅が足りない場合(終端、あるいはETA区間の外へ抜ける通し運転)は
 * 配列端のindexを返す。ETAが説明できない範囲まで棄却するのは正しくないため、
 * 足りない側は許容を広げる方向へ倒す。
 */
const advanceByStops = (
  length: number,
  from: number,
  direction: 1 | -1,
  count: number,
  isStopAt: (index: number) => boolean
): number => {
  if (count <= 0) {
    return from;
  }
  let remaining = count;
  let last = from;
  for (let i = from + direction; i >= 0 && i < length; i += direction) {
    last = i;
    if (isStopAt(i)) {
      remaining -= 1;
      if (remaining === 0) {
        return i;
      }
    }
  }
  return last;
};

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
  stopStationIds,
}: {
  stations: Station[];
  anchorStationId: number;
  targetStationId: number;
  latitude: number;
  longitude: number;
  toleranceStations: number;
  /**
   * 停車駅のID(ETAのstops)。許容を「停車駅いくつぶん」で数えるために使う。
   * 省略時・空の場合は stations の全駅を停車駅として数える(=index差そのまま)。
   */
  stopStationIds?: readonly number[];
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

  // 許容は「停車駅いくつぶん」で数える。stations は通過駅も含むので、index差のまま
  // 数えると急行の通過駅ぶんだけ許容が目減りし、次の停車駅で測位が復活しただけでも
  // 棄却される(副都心線の急行は池袋→新宿三丁目がindex差4で、許容1駅では必ず外れる)。
  // 地下鉄では発車を観測できず、次の測位が次の停車駅まで届かないことが普通にあるため、
  // ここが目減りすると正常な測位を上限時間まで弾き続けることになる。
  const stopIds =
    stopStationIds && stopStationIds.length > 0
      ? new Set(stopStationIds)
      : null;
  const isStopAt = (index: number): boolean => {
    if (stopIds == null) {
      return true;
    }
    const id = stations[index]?.id;
    return id != null && stopIds.has(id);
  };

  // 進行方向はETA側の並び(アンカー→対象駅)から決める。
  const direction = Math.sign(targetIdx - anchorIdx);
  if (direction === 0) {
    // アンカー駅で停車中の推定。前後どちらへも停車駅tolerance個ぶん以上離れていたら
    // 説明できない。
    const aheadIdx = advanceByStops(
      stations.length,
      anchorIdx,
      1,
      toleranceStations,
      isStopAt
    );
    const behindIdx = advanceByStops(
      stations.length,
      anchorIdx,
      -1,
      toleranceStations,
      isStopAt
    );
    return fixIdx > aheadIdx || fixIdx < behindIdx;
  }

  const aheadLimitIdx = advanceByStops(
    stations.length,
    targetIdx,
    direction > 0 ? 1 : -1,
    toleranceStations,
    isStopAt
  );
  const behindLimitIdx = advanceByStops(
    stations.length,
    anchorIdx,
    direction > 0 ? -1 : 1,
    toleranceStations,
    isStopAt
  );
  const progress = (fixIdx - anchorIdx) * direction;
  const limit = (aheadLimitIdx - anchorIdx) * direction;
  const behindLimit = (behindLimitIdx - anchorIdx) * direction;
  return progress > limit || progress < behindLimit;
};
