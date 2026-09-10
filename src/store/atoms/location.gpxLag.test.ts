/**
 * GPXの実走トラックを setLocation の実パイプラインへ流し、EMAスムージングの
 * 定常遅れが測位更新間隔(LOCATION_TIME_INTERVAL)にどう依存するかを実測する。
 *
 * #6395 で既定の更新間隔が 5秒 → 10秒 へ変わったため、EMAの定常遅れ
 * ((1-α)/α)·v·Δt が理論上そのまま倍になる。その影響を数値で確認する。
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type * as Location from 'expo-location';
import getDistance from 'geolib/es/getPreciseDistance';
import { store } from '..';
import { locationAtom, resetLocationState, setLocation } from './location';

type Point = { t: number; lat: number; lon: number };

const parseGpx = (relPath: string): Point[] => {
  const xml = readFileSync(join(process.cwd(), relPath), 'utf8');
  const points: Point[] = [];
  const re =
    /<(?:wpt|trkpt)\s+lat="([-\d.]+)"\s+lon="([-\d.]+)"[^>]*>[\s\S]*?<time>([^<]+)<\/time>/g;
  let m = re.exec(xml);
  while (m !== null) {
    points.push({
      lat: Number(m[1]),
      lon: Number(m[2]),
      t: Date.parse(m[3]),
    });
    m = re.exec(xml);
  }
  return points.sort((a, b) => a.t - b.t);
};

const makeLocation = (p: Point, accuracy: number): Location.LocationObject => ({
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

const dist = (
  a: { lat: number; lon: number },
  b: { lat: number; lon: number }
) =>
  getDistance(
    { latitude: a.lat, longitude: a.lon },
    { latitude: b.lat, longitude: b.lon },
    0.1
  );

/** 真のトラックを線形補間して任意時刻の位置を返す */
const truthAt = (track: Point[], t: number): Point => {
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

/** 速度がほぼ0の区間を「駅での停車」として抽出する */
const findStops = (track: Point[]) => {
  const STOP_SPEED = 1.5; // m/s
  const MIN_DWELL_MS = 15_000;
  const stops: { anchor: Point; arriveAt: number; departAt: number }[] = [];
  let runStart: number | null = null;
  for (let i = 1; i < track.length; i += 1) {
    const dt = (track[i].t - track[i - 1].t) / 1000;
    const v = dt > 0 ? dist(track[i - 1], track[i]) / dt : 0;
    if (v < STOP_SPEED) {
      if (runStart === null) runStart = i - 1;
    } else if (runStart !== null) {
      if (track[i - 1].t - track[runStart].t >= MIN_DWELL_MS) {
        const mid = track[((runStart + i - 1) / 2) | 0];
        stops.push({
          anchor: mid,
          arriveAt: track[runStart].t,
          departAt: track[i - 1].t,
        });
      }
      runStart = null;
    }
  }
  return stops;
};

/** 指定した更新間隔・精度でパイプラインへ流し、平滑後の軌跡を返す */
const runPipeline = (track: Point[], intervalMs: number, accuracy: number) => {
  resetLocationState();
  const samples: { t: number; lat: number; lon: number }[] = [];
  for (let t = track[0].t; t <= track[track.length - 1].t; t += intervalMs) {
    setLocation(makeLocation(truthAt(track, t), accuracy));
    const cur = store.get(locationAtom);
    if (cur) {
      samples.push({
        t,
        lat: cur.coords.latitude,
        lon: cur.coords.longitude,
      });
    }
  }
  return samples;
};

const percentile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
};

const CASES = [
  { label: 'v10.9以前 (5s)', interval: 5000 },
  { label: 'v10.10以降 (10s)', interval: 10000 },
];
const ACCURACIES = [30, 60, 250];

const TRACKS = [
  { name: '山手線 (実走ログ)', path: 'ios/SampleJY.gpx' },
  { name: '京王線特急 (生成/最高110km/h)', path: 'ios/KeioSpecialExpress.gpx' },
];

describe('GPX を実パイプラインへ流したときの EMA 遅れ', () => {
  for (const trackDef of TRACKS) {
    it(`${trackDef.name}`, () => {
      const track = parseGpx(trackDef.path);
      expect(track.length).toBeGreaterThan(100);
      const stops = findStops(track);

      const lines: string[] = [];
      lines.push(
        `\n■ ${trackDef.name}  点数=${track.length} 停車検出=${stops.length}`
      );
      lines.push(
        '  精度  間隔  EMA遅れ(中央/p90)  実効遅れ(中央/p90)  到着圏R  発車後の遅延  ★次駅の何m手前で区間が進むか(中央/最小)'
      );

      for (const accuracy of ACCURACIES) {
        // useRefreshStation の実効到着圏: clamp(区間/4,75,200) 最大値 + 精度ボーナス
        const R = 200 + Math.min(accuracy * 0.5, 150);
        for (const c of CASES) {
          const samples = runPipeline(track, c.interval, accuracy);
          // 更新直後の遅れ = EMA の定常遅れそのもの
          const lags = samples.map((s) => dist(s, truthAt(track, s.t)));
          // 画面に出ている遅れ = 直近サンプルを保持したまま(ゼロ次ホールド)
          // 実際の列車が進むぶんが上乗せされる
          const effLags: number[] = [];
          let si = 0;
          for (const p of track) {
            while (si + 1 < samples.length && samples[si + 1].t <= p.t) si += 1;
            if (samples[si].t <= p.t) effLags.push(dist(samples[si], p));
          }

          const delays: number[] = [];
          for (const stop of stops) {
            const tTrue = track.find(
              (p) => p.t >= stop.departAt && dist(p, stop.anchor) > R
            )?.t;
            const tSmooth = samples.find(
              (s) => s.t >= stop.departAt && dist(s, stop.anchor) > R
            )?.t;
            if (tTrue != null && tSmooth != null && tSmooth >= tTrue) {
              delays.push((tSmooth - tTrue) / 1000);
            }
          }

          // ★ 区間 stops[i] → stops[i+1] で、次駅の到着判定(=区間の進行)が
          // 成立した瞬間に、実際の列車が次駅まであと何メートルの位置にいるか。
          // 理想は R メートル手前。負の値は「次駅に着いた/通り過ぎてから進む」。
          const signedLeads: number[] = [];
          for (let i = 0; i + 1 < stops.length; i += 1) {
            const from = stops[i];
            const to = stops[i + 1];
            const hit = samples.find(
              (s) => s.t > from.departAt && dist(s, to.anchor) <= R
            );
            if (!hit || hit.t > to.departAt) continue;
            const remaining = dist(truthAt(track, hit.t), to.anchor);
            // 物理的な到着(停車開始)より前なら「手前」、後なら「行き過ぎ」
            signedLeads.push(hit.t <= to.arriveAt ? remaining : -remaining);
          }

          lines.push(
            `  ${String(accuracy).padStart(3)}m  ${String(c.interval / 1000).padStart(2)}s  ` +
              `${percentile(lags, 0.5).toFixed(0).padStart(7)}m /${percentile(lags, 0.9).toFixed(0).padStart(5)}m  ` +
              `${percentile(effLags, 0.5).toFixed(0).padStart(9)}m /${percentile(effLags, 0.9).toFixed(0).padStart(5)}m  ` +
              `${String(R).padStart(6)}m  ` +
              `${(delays.length ? `${percentile(delays, 0.5).toFixed(0)}秒` : '—').padStart(6)}  ` +
              `${
                signedLeads.length
                  ? `${percentile(signedLeads, 0.5).toFixed(0).padStart(6)}m / ${percentile(signedLeads, 0).toFixed(0).padStart(6)}m (n=${signedLeads.length})`
                  : '—'
              }`
          );
        }
      }
      console.log(lines.join('\n'));
    });
  }
});
