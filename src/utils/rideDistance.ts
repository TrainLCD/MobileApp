import getDistance from 'geolib/es/getDistance';
import type { Station } from '~/@types/graphql';
import type { RideDistanceSource } from '~/lib/rideLog';
import { getTrackDistance } from '~/lib/trackDistances';

type StationCoords = Pick<Station, 'id' | 'latitude' | 'longitude'>;

const hasCoords = (
  s: StationCoords | undefined
): s is StationCoords & { latitude: number; longitude: number } =>
  s?.latitude != null && s?.longitude != null;

type SegmentSum = {
  meters: number;
  trackSegments: number;
  straightSegments: number;
};

// 駅の並びを順にたどり、隣り合う駅どうしの距離を合計する(メートル)。
// 線路の長さを覚えている組はそれを使い、無ければ座標の直線距離で代える。
// 座標を持たない駅は、直線距離で代えるときには飛ばして前後の駅を直接つなぐ。
const sumAlong = (path: StationCoords[]): SegmentSum => {
  const sum: SegmentSum = { meters: 0, trackSegments: 0, straightSegments: 0 };
  // 直線距離でつなぐときの起点(座標のある直近の駅)
  let anchor: (StationCoords & { latitude: number; longitude: number }) | null =
    path[0] && hasCoords(path[0]) ? path[0] : null;
  for (let i = 1; i < path.length; i++) {
    const prev = path[i - 1];
    const cur = path[i];
    const track =
      prev.id != null && cur.id != null
        ? getTrackDistance(prev.id, cur.id)
        : null;
    if (track != null) {
      sum.meters += track;
      sum.trackSegments += 1;
      anchor = hasCoords(cur) ? cur : null;
      continue;
    }
    if (!hasCoords(cur)) {
      continue;
    }
    if (anchor) {
      sum.meters += getDistance(
        { latitude: anchor.latitude, longitude: anchor.longitude },
        { latitude: cur.latitude, longitude: cur.longitude }
      );
      sum.straightSegments += 1;
    }
    anchor = cur;
  }
  return sum;
};

const toMeasurement = (sum: SegmentSum): RideDistanceMeasurement => ({
  meters: sum.meters,
  source:
    sum.trackSegments === 0
      ? 'haversine'
      : sum.straightSegments === 0
        ? 'track'
        : 'mixed',
});

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

export type RideDistanceMeasurement = {
  meters: number;
  // track: すべて線路の長さ、haversine: すべて直線距離、mixed: 両方を合わせた
  source: RideDistanceSource;
};

/**
 * 乗車中に続けて検出した2駅のあいだの乗車距離(メートル)と、その求め方を返す。
 *
 * GPS が途切れて途中の駅を検出できなかった場合も、乗車中の駅リスト上で
 * 2駅のあいだにある駅をたどって間を埋める。隣り合う駅どうしは、StationAPI から
 * 受け取った線路の長さ(src/lib/trackDistances.ts)を使い、無い組は直線距離で代える。
 * どちらかの駅がリストに無ければ、2駅の直線距離を返す。
 * 環状線はどちら回りか分からないため、短い方の経路をとる。
 */
export const measureRideDistance = (
  stations: StationCoords[],
  from: StationCoords,
  to: StationCoords,
  isLoopLine: boolean
): RideDistanceMeasurement => {
  if (from.id != null && from.id === to.id) {
    return { meters: 0, source: 'haversine' };
  }
  const fromIndex = stations.findIndex((s) => s.id === from.id);
  const toIndex = stations.findIndex((s) => s.id === to.id);
  if (fromIndex === -1 || toIndex === -1) {
    return toMeasurement(sumAlong([from, to]));
  }
  if (isLoopLine) {
    const forward = sumAlong(loopPath(stations, fromIndex, toIndex, 1));
    const backward = sumAlong(loopPath(stations, fromIndex, toIndex, -1));
    return toMeasurement(
      forward.meters <= backward.meters ? forward : backward
    );
  }
  const start = Math.min(fromIndex, toIndex);
  const end = Math.max(fromIndex, toIndex);
  return toMeasurement(sumAlong(stations.slice(start, end + 1)));
};

// 距離だけが要る呼び出し元向け
export const getRideDistanceMeters = (
  stations: StationCoords[],
  from: StationCoords,
  to: StationCoords,
  isLoopLine: boolean
): number => measureRideDistance(stations, from, to, isLoopLine).meters;
