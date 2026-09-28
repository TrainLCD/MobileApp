import getDistance from 'geolib/es/getDistance';
import type { Station } from '~/@types/graphql';

type StationCoords = Pick<Station, 'id' | 'latitude' | 'longitude'>;

const hasCoords = (
  s: StationCoords | undefined
): s is StationCoords & { latitude: number; longitude: number } =>
  s?.latitude != null && s?.longitude != null;

// 駅の並びを順にたどり、隣り合う駅どうしの直線距離を合計する(メートル)。
// 座標を持たない駅は飛ばして、その前後の駅を直接つなぐ。
const sumAlong = (path: StationCoords[]): number => {
  let total = 0;
  let prev: (StationCoords & { latitude: number; longitude: number }) | null =
    null;
  for (const s of path) {
    if (!hasCoords(s)) {
      continue;
    }
    if (prev) {
      total += getDistance(
        { latitude: prev.latitude, longitude: prev.longitude },
        { latitude: s.latitude, longitude: s.longitude }
      );
    }
    prev = s;
  }
  return total;
};

// 環状線で from から to へ、配列の向きに step ずつ進んだ駅の並び(両端を含む)
const loopPath = (
  stations: StationCoords[],
  fromIndex: number,
  toIndex: number,
  step: 1 | -1
): StationCoords[] => {
  const n = stations.length;
  const path: StationCoords[] = [];
  for (let i = fromIndex; ; i = (i + step + n) % n) {
    path.push(stations[i]);
    if (i === toIndex) {
      break;
    }
  }
  return path;
};

/**
 * 乗車中に続けて検出した2駅のあいだの乗車距離(メートル)を求める。
 *
 * GPS が途切れて途中の駅を検出できなかった場合も、乗車中の駅リスト上で
 * 2駅のあいだにある駅をたどって間を埋める。線路長のデータは持たないため、
 * 隣り合う駅どうしの直線距離の合計になる(カーブの多い区間では実際より短い)。
 * どちらかの駅がリストに無ければ、2駅の直線距離を返す。
 * 環状線はどちら回りか分からないため、短い方の経路をとる。
 */
export const getRideDistanceMeters = (
  stations: StationCoords[],
  from: StationCoords,
  to: StationCoords,
  isLoopLine: boolean
): number => {
  if (from.id != null && from.id === to.id) {
    return 0;
  }
  const fromIndex = stations.findIndex((s) => s.id === from.id);
  const toIndex = stations.findIndex((s) => s.id === to.id);
  if (fromIndex === -1 || toIndex === -1) {
    return sumAlong([from, to]);
  }
  if (isLoopLine) {
    return Math.min(
      sumAlong(loopPath(stations, fromIndex, toIndex, 1)),
      sumAlong(loopPath(stations, fromIndex, toIndex, -1))
    );
  }
  const start = Math.min(fromIndex, toIndex);
  const end = Math.max(fromIndex, toIndex);
  return sumAlong(stations.slice(start, end + 1));
};
