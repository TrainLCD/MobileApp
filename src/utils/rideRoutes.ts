import type { RideCoordinate, RideSessionWithStops } from '~/lib/rideLog';
import { measureRide, type RidePeriodRange } from '~/utils/rideStats';

/**
 * 振り返り機能(#5751)の移動経路の地図に描く線を、乗車ログから組み立てる。
 * 集計(src/utils/rideStats.ts)と同じ乗車・同じ駅の範囲を描くよう、measureRide が
 * 集計に使った駅だけをたどる。
 */

// 線の太さの段階の数。区間ごとの乗車回数を、期間内でいちばん多い回数に対する
// 割合でこの数に振り分ける
export const RIDE_ROUTE_LEVELS = 3;

export type RideRouteLine = {
  // 同じ色・同じ太さの段階で続く駅間をつないだ線
  coordinates: RideCoordinate[];
  // 駅間を到着した側の駅の路線色(集計の路線ごとの距離と同じ数え方)
  color: string | null;
  // 1 から RIDE_ROUTE_LEVELS まで。大きいほどよく乗った区間
  level: number;
};

export type RideRouteStation = RideCoordinate & {
  // 検出した駅だけが名前を持つ。検出できずに経路で埋めた駅は null
  name: string | null;
  // 描いた線の端にある駅(乗車の始まりや終わりになっている駅)
  isTerminal: boolean;
};

export type RideRouteBounds = {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
};

export type RideRoutes = {
  lines: RideRouteLine[];
  // 地図に1駅間でも描いた路線。凡例と読み上げを、描いた路線だけにそろえるために使う
  lineIds: number[];
  stations: RideRouteStation[];
  // 乗車回数に数えたのに、地図に描ける駅間が1つも無い乗車の数。
  // 駅の座標を保存する前に記録した乗車がこれに当たる
  unmappedRideCount: number;
  bounds: RideRouteBounds | null;
};

type Edge = {
  key: string;
  from: RideCoordinate;
  to: RideCoordinate;
  color: string | null;
};

const coordinateKey = (c: RideCoordinate): string =>
  `${c.latitude},${c.longitude}`;

// 向きを問わず同じ駅間・同じ路線色なら同じ区間として数える
const edgeKey = (
  a: RideCoordinate,
  b: RideCoordinate,
  color: string | null
): string => {
  const [first, second] = [coordinateKey(a), coordinateKey(b)].sort();
  return `${color ?? ''}|${first}|${second}`;
};

const toLevel = (count: number, maxCount: number): number => {
  if (maxCount <= 1) {
    return 1;
  }
  return (
    1 + Math.round(((count - 1) / (maxCount - 1)) * (RIDE_ROUTE_LEVELS - 1))
  );
};

const sameCoordinate = (a: RideCoordinate, b: RideCoordinate): boolean =>
  a.latitude === b.latitude && a.longitude === b.longitude;

/**
 * 期間に乗りはじめた乗車の移動経路をまとめる。range の外に乗りはじめた乗車と、
 * 集計で乗車回数に数えない乗車は描かない。
 *
 * 検出した駅どうしのあいだは、記録したときにたどった駅(pathFromPrevious)で埋める。
 * 駅の座標が無い駅をまたぐ駅間は描かない。
 */
export const buildRideRoutes = (
  sessions: RideSessionWithStops[],
  range: RidePeriodRange
): RideRoutes => {
  const startMs = range.start.getTime();
  const endMs = range.end.getTime();

  const sessionEdges: Edge[][] = [];
  // 区間ごとの、その区間を通った乗車の数
  const counts = new Map<string, number>();
  const names = new Map<string, string>();
  const lineIds = new Set<number>();
  let unmappedRideCount = 0;

  for (const session of sessions) {
    if (session.startedAt < startMs || session.startedAt >= endMs) {
      continue;
    }
    const { stops } = measureRide(session);
    if (stops.length === 0) {
      continue;
    }

    const edges: Edge[] = [];
    for (let i = 1; i < stops.length; i++) {
      const prev = stops[i - 1];
      const cur = stops[i];
      if (
        prev.latitude == null ||
        prev.longitude == null ||
        cur.latitude == null ||
        cur.longitude == null
      ) {
        continue;
      }
      const chain: RideCoordinate[] = [
        { latitude: prev.latitude, longitude: prev.longitude },
        ...(cur.pathFromPrevious ?? []),
        { latitude: cur.latitude, longitude: cur.longitude },
      ];
      for (let j = 1; j < chain.length; j++) {
        const from = chain[j - 1];
        const to = chain[j];
        if (sameCoordinate(from, to)) {
          continue;
        }
        edges.push({
          key: edgeKey(from, to, cur.lineColor),
          from,
          to,
          color: cur.lineColor,
        });
        if (cur.lineId != null) {
          lineIds.add(cur.lineId);
        }
      }
    }
    for (const stop of stops) {
      if (
        stop.latitude != null &&
        stop.longitude != null &&
        stop.stationName != null
      ) {
        names.set(
          coordinateKey({ latitude: stop.latitude, longitude: stop.longitude }),
          stop.stationName
        );
      }
    }

    if (edges.length === 0) {
      unmappedRideCount += 1;
      continue;
    }
    sessionEdges.push(edges);
    // 1回の乗車で同じ区間を2度通っても、その乗車は1回と数える
    for (const key of new Set(edges.map((e) => e.key))) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  const maxCount = Math.max(0, ...counts.values());

  // 乗車の順に駅間をたどり、色と太さの段階が同じあいだは1本の線につなぐ。
  // 描いた区間は2度描かない(線の数を抑え、重ね塗りで色が濃くならないようにする)
  const lines: RideRouteLine[] = [];
  const drawn = new Set<string>();
  const neighbors = new Map<string, Set<string>>();
  const coordinates = new Map<string, RideCoordinate>();

  for (const edges of sessionEdges) {
    let current: RideRouteLine | null = null;
    for (const edge of edges) {
      if (drawn.has(edge.key)) {
        current = null;
        continue;
      }
      drawn.add(edge.key);

      const fromKey = coordinateKey(edge.from);
      const toKey = coordinateKey(edge.to);
      coordinates.set(fromKey, edge.from);
      coordinates.set(toKey, edge.to);
      neighbors.set(fromKey, (neighbors.get(fromKey) ?? new Set()).add(toKey));
      neighbors.set(toKey, (neighbors.get(toKey) ?? new Set()).add(fromKey));

      const level = toLevel(counts.get(edge.key) ?? 1, maxCount);
      const last: RideCoordinate | undefined =
        current?.coordinates[current.coordinates.length - 1];
      if (
        current &&
        last &&
        current.color === edge.color &&
        current.level === level &&
        sameCoordinate(last, edge.from)
      ) {
        current.coordinates.push(edge.to);
        continue;
      }
      current = {
        coordinates: [edge.from, edge.to],
        color: edge.color,
        level,
      };
      lines.push(current);
    }
  }

  const stations: RideRouteStation[] = [];
  let bounds: RideRouteBounds | null = null;
  for (const [key, coordinate] of coordinates) {
    stations.push({
      ...coordinate,
      name: names.get(key) ?? null,
      isTerminal: (neighbors.get(key)?.size ?? 0) <= 1,
    });
    bounds = bounds
      ? {
          minLatitude: Math.min(bounds.minLatitude, coordinate.latitude),
          maxLatitude: Math.max(bounds.maxLatitude, coordinate.latitude),
          minLongitude: Math.min(bounds.minLongitude, coordinate.longitude),
          maxLongitude: Math.max(bounds.maxLongitude, coordinate.longitude),
        }
      : {
          minLatitude: coordinate.latitude,
          maxLatitude: coordinate.latitude,
          minLongitude: coordinate.longitude,
          maxLongitude: coordinate.longitude,
        };
  }

  return {
    lines,
    lineIds: [...lineIds],
    stations,
    unmappedRideCount,
    bounds,
  };
};

export type RideRouteRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

// 経路の外側に残す余白(経路の幅・高さに対する倍率)
const REGION_PADDING = 1.3;
// 1駅間だけの乗車でも街の様子が分かる程度には引いて表示する(度)
const MIN_REGION_DELTA = 0.02;

/** 経路全体が収まる地図の表示範囲 */
export const getRideRouteRegion = (
  bounds: RideRouteBounds
): RideRouteRegion => ({
  latitude: (bounds.minLatitude + bounds.maxLatitude) / 2,
  longitude: (bounds.minLongitude + bounds.maxLongitude) / 2,
  latitudeDelta: Math.max(
    (bounds.maxLatitude - bounds.minLatitude) * REGION_PADDING,
    MIN_REGION_DELTA
  ),
  longitudeDelta: Math.max(
    (bounds.maxLongitude - bounds.minLongitude) * REGION_PADDING,
    MIN_REGION_DELTA
  ),
});
