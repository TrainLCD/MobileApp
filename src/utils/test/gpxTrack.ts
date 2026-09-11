/**
 * assets/gpx のGPXをテストから読み、走行トラックとして扱うためのユーティリティ。
 * 測位パイプライン(store/atoms/location)へGPXを流すテストが共用する。
 * ストアやReactへは依存させず、純粋な解析・幾何計算だけを持たせる。
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type * as Location from 'expo-location';
import getPreciseDistance from 'geolib/es/getPreciseDistance';

export type TrackPoint = { t: number; lat: number; lon: number };

/** 速度がほぼ0の区間から検出した「駅での停車」 */
export type TrackStop = {
  anchor: TrackPoint;
  arriveAt: number;
  departAt: number;
};

/** GPXのディレクトリ(リポジトリルート起点) */
export const GPX_DIR = 'assets/gpx';

export const parseGpx = (relPath: string): TrackPoint[] => {
  const xml = readFileSync(join(process.cwd(), relPath), 'utf8');
  const points: TrackPoint[] = [];
  // trkpt / wpt のどちらの形式でも読む(実走ログと生成物で異なる)
  const re =
    /<(?:wpt|trkpt)\s+lat="([-\d.]+)"\s+lon="([-\d.]+)"[^>]*>[\s\S]*?<time>([^<]+)<\/time>/g;
  let m = re.exec(xml);
  while (m !== null) {
    points.push({ lat: Number(m[1]), lon: Number(m[2]), t: Date.parse(m[3]) });
    m = re.exec(xml);
  }
  return points.sort((a, b) => a.t - b.t);
};

export const trackDistance = (
  a: { lat: number; lon: number },
  b: { lat: number; lon: number }
): number =>
  getPreciseDistance(
    { latitude: a.lat, longitude: a.lon },
    { latitude: b.lat, longitude: b.lon },
    0.1
  );

/** 真のトラックを線形補間して任意時刻の位置を返す */
export const truthAt = (track: TrackPoint[], t: number): TrackPoint => {
  if (t <= track[0].t) return track[0];
  const last = track[track.length - 1];
  if (t >= last.t) return last;
  let lo = 0;
  let hi = track.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (track[mid].t <= t) lo = mid;
    else hi = mid;
  }
  const a = track[lo];
  const b = track[hi];
  const r = (t - a.t) / (b.t - a.t);
  return {
    t,
    lat: a.lat + (b.lat - a.lat) * r,
    lon: a.lon + (b.lon - a.lon) * r,
  };
};

/**
 * 速度がほぼ0の区間を「駅での停車」として抽出する。
 *
 * 途中駅は停車時間(MIN_DWELL_MS)で拾うが、始発駅と終着駅は拾えない。
 * scripts/generate-location-gpx.mjs は始発駅の停車時間を書き出さず(1点目から発車する)、
 * 終着駅では減速しきった時点でトラックが終わるためどちらも停車時間が下限に届かない。
 * トラックの先頭・末尾で静止している場合はその点が始発駅・終着駅なので、停車時間の
 * 下限に関わらず停車として扱う。実走行ログのように走行中から記録が始まる(終わる)
 * トラックでは先頭・末尾が静止区間にならないため、駅でない点を拾うことはない。
 */
export const findStops = (track: TrackPoint[]): TrackStop[] => {
  const STOP_SPEED = 1.5; // m/s
  const MIN_DWELL_MS = 15_000;
  const runs: { start: number; end: number }[] = [];
  let runStart: number | null = null;
  for (let i = 1; i < track.length; i += 1) {
    const dt = (track[i].t - track[i - 1].t) / 1000;
    const v = dt > 0 ? trackDistance(track[i - 1], track[i]) / dt : 0;
    if (v < STOP_SPEED) {
      if (runStart === null) runStart = i - 1;
    } else if (runStart !== null) {
      runs.push({ start: runStart, end: i - 1 });
      runStart = null;
    }
  }
  if (runStart !== null) {
    runs.push({ start: runStart, end: track.length - 1 });
  }

  return runs
    .filter(
      (r) =>
        r.start === 0 ||
        r.end === track.length - 1 ||
        track[r.end].t - track[r.start].t >= MIN_DWELL_MS
    )
    .map((r) => ({
      anchor: track[(r.start + r.end) >> 1],
      arriveAt: track[r.start].t,
      departAt: track[r.end].t,
    }));
};

export const toLocation = (
  p: TrackPoint,
  accuracy: number
): Location.LocationObject => ({
  coords: {
    latitude: p.lat,
    longitude: p.lon,
    accuracy,
    altitude: 0,
    altitudeAccuracy: 0,
    heading: 0,
    speed: null,
  },
  timestamp: p.t,
});

/** 再現性のある擬似乱数（測位ノイズの注入に使う） */
export const makeNoise = (seed: number): (() => number) => {
  let state = seed >>> 0;
  const next = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
  // Box-Muller法で標準正規分布へ変換する
  return () => {
    const u = Math.max(next(), Number.EPSILON);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * next());
  };
};

export const METERS_PER_DEG_LAT = 111_132;

export const median = (values: number[]): number => {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

export const clamp = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v));
