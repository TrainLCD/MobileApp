/**
 * GPXの走行トラックを setLocation の実パイプラインへ流し、EMAスムージングの遅れが
 * 「次は」「まもなく」「到着(=LineBoardの区間進行)」の切り替わり位置をどれだけ
 * 後ろへずらすかを実測する。
 *
 * #6395 で既定の測位更新間隔が 5秒 → 10秒 になった。EMAの定常遅れは
 * ((1-α)/α)·v·Δt で Δt に比例するため、間隔を倍にすると遅れもそのまま倍になる。
 * さらに更新間の据え置き(ゼロ次ホールド)で最大 v·Δt が上乗せされる。
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type * as Location from 'expo-location';
import getDistance from 'geolib/es/getPreciseDistance';
import { store } from '..';
import { locationAtom, resetLocationState, setLocation } from './location';

type Point = { t: number; lat: number; lon: number };
type Stop = { anchor: Point; arriveAt: number; departAt: number };

const parseGpx = (relPath: string): Point[] => {
  const xml = readFileSync(join(process.cwd(), relPath), 'utf8');
  const points: Point[] = [];
  const re =
    /<(?:wpt|trkpt)\s+lat="([-\d.]+)"\s+lon="([-\d.]+)"[^>]*>[\s\S]*?<time>([^<]+)<\/time>/g;
  let m = re.exec(xml);
  while (m !== null) {
    points.push({ lat: Number(m[1]), lon: Number(m[2]), t: Date.parse(m[3]) });
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
const findStops = (track: Point[]): Stop[] => {
  const STOP_SPEED = 1.5; // m/s
  const MIN_DWELL_MS = 15_000;
  const stops: Stop[] = [];
  let runStart: number | null = null;
  for (let i = 1; i < track.length; i += 1) {
    const dt = (track[i].t - track[i - 1].t) / 1000;
    const v = dt > 0 ? dist(track[i - 1], track[i]) / dt : 0;
    if (v < STOP_SPEED) {
      if (runStart === null) runStart = i - 1;
    } else if (runStart !== null) {
      if (track[i - 1].t - track[runStart].t >= MIN_DWELL_MS) {
        stops.push({
          anchor: track[((runStart + i - 1) / 2) | 0],
          arriveAt: track[runStart].t,
          departAt: track[i - 1].t,
        });
      }
      runStart = null;
    }
  }
  return stops;
};

/** 再現性のある擬似乱数（測位ノイズの注入に使う） */
const makeNoise = (seed: number) => {
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

const METERS_PER_DEG_LAT = 111_132;

/**
 * 指定した更新間隔・精度でパイプラインへ流し、平滑後の軌跡を返す。
 * noiseSigmaMeters を渡すと入力座標へ正規分布のノイズを乗せる。Androidの
 * accuracy は68%信頼半径なので、σ=accuracy が素直なモデルになる。
 */
const runPipeline = (
  track: Point[],
  intervalMs: number,
  accuracy: number,
  noiseSigmaMeters = 0
) => {
  resetLocationState();
  const noise = makeNoise(0x5eed);
  const samples: Point[] = [];
  for (let t = track[0].t; t <= track[track.length - 1].t; t += intervalMs) {
    const truth = truthAt(track, t);
    const input =
      noiseSigmaMeters > 0
        ? {
            t,
            lat: truth.lat + (noise() * noiseSigmaMeters) / METERS_PER_DEG_LAT,
            lon:
              truth.lon +
              (noise() * noiseSigmaMeters) /
                (METERS_PER_DEG_LAT * Math.cos((truth.lat * Math.PI) / 180)),
          }
        : truth;
    setLocation(makeLocation(input, accuracy));
    const cur = store.get(locationAtom);
    if (cur) {
      samples.push({ t, lat: cur.coords.latitude, lon: cur.coords.longitude });
    }
  }
  return samples;
};

/**
 * 区間ごとに、次駅の到着圏へ入る判定が false→true へ何回変化するかを数える。
 * ノイズで平滑後の座標が判定圏を出入りすると1区間で複数回立ち、到着表示が
 * ばたつく。正常なら区間あたり1回。
 */
const countArrivalChatter = (
  stops: Stop[],
  samples: Point[],
  accuracy: number
) => {
  const bonus = Math.min(accuracy * 0.5, 150);
  let worst = 0;
  for (let i = 0; i + 1 < stops.length; i += 1) {
    const from = stops[i];
    const to = stops[i + 1];
    const arrivedTh = clamp(dist(from.anchor, to.anchor) / 4, 75, 200) + bonus;
    let prev = false;
    let rises = 0;
    for (const s of samples) {
      if (s.t <= from.departAt || s.t > to.departAt) continue;
      const inside = dist(s, to.anchor) <= arrivedTh;
      if (inside && !prev) rises += 1;
      prev = inside;
    }
    worst = Math.max(worst, rises);
  }
  return worst;
};

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

const median = (values: number[]) => {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

/**
 * 区間ごとに「次は」「まもなく」「到着」が成立した瞬間の、実際の列車位置を測る。
 * 判定圏は useThreshold / useRefreshStation と同じ式で区間長から求める。
 */
const measureTransitions = (
  track: Point[],
  stops: Stop[],
  samples: Point[],
  accuracy: number
) => {
  const bonus = Math.min(accuracy * 0.5, 150);
  const departed: number[] = []; // 発車後、何m進んで「次は」へ変わったか
  const approaching: number[] = []; // 次駅の何m手前で「まもなく」が出たか
  const arrived: number[] = []; // 次駅の何m手前で到着判定(区間進行)が成立したか
  const ideal = { approach: [] as number[], arrive: [] as number[] };

  for (let i = 0; i + 1 < stops.length; i += 1) {
    const from = stops[i];
    const to = stops[i + 1];
    const between = dist(from.anchor, to.anchor);
    const arrivedTh = clamp(between / 4, 75, 200) + bonus;
    const approachTh = clamp(between / 2, 200, 1000) + bonus;
    ideal.approach.push(approachTh);
    ideal.arrive.push(arrivedTh);

    const leave = samples.find(
      (s) => s.t > from.departAt && dist(s, from.anchor) > arrivedTh
    );
    if (leave && leave.t < to.arriveAt) {
      departed.push(dist(truthAt(track, leave.t), from.anchor));
    }

    const near = samples.find(
      (s) => s.t > from.departAt && dist(s, to.anchor) <= approachTh
    );
    if (near && near.t <= to.departAt) {
      approaching.push(dist(truthAt(track, near.t), to.anchor));
    }

    const hit = samples.find(
      (s) => s.t > from.departAt && dist(s, to.anchor) <= arrivedTh
    );
    if (hit && hit.t <= to.departAt) {
      arrived.push(dist(truthAt(track, hit.t), to.anchor));
    }
  }

  return {
    departed: median(departed),
    approaching: median(approaching),
    arrived: median(arrived),
    idealApproach: median(ideal.approach),
    idealArrive: median(ideal.arrive),
    n: arrived.length,
  };
};

const CASES = [
  { label: '5s', interval: 5000 },
  { label: '10s', interval: 10000 },
];
const ACCURACIES = [30, 60, 250];

const TRACKS = [
  {
    name: '片町線(学研都市線) 快速 京田辺→木津 / 最高95km/h',
    path: 'gpx/KatamachiRapid.gpx',
  },
  { name: '山手線 実走ログ', path: 'gpx/SampleJY.gpx' },
  { name: '京王線特急 / 最高110km/h', path: 'gpx/KeioSpecialExpress.gpx' },
  {
    name: '総武快速線 錦糸町→津田沼 / 最高120km/h',
    path: 'gpx/SobuRapid.gpx',
  },
];

describe('GPX を実パイプラインへ流したときの表示切り替わり位置', () => {
  for (const trackDef of TRACKS) {
    it(`${trackDef.name}`, () => {
      const track = parseGpx(trackDef.path);
      expect(track.length).toBeGreaterThan(100);
      const stops = findStops(track);
      expect(stops.length).toBeGreaterThan(1);

      const sections: number[] = [];
      for (let i = 0; i + 1 < stops.length; i += 1) {
        sections.push(dist(stops[i].anchor, stops[i + 1].anchor));
      }

      const lines: string[] = [];
      lines.push(
        `\n■ ${trackDef.name}  停車=${stops.length} 駅間中央値=${median(sections).toFixed(0)}m`
      );
      lines.push(
        '  精度 間隔 | 発車後「次は」まで | 「まもなく」表示 (理想) | 到着=区間進行 (理想)'
      );

      for (const accuracy of ACCURACIES) {
        for (const c of CASES) {
          const samples = runPipeline(track, c.interval, accuracy);
          const r = measureTransitions(track, stops, samples, accuracy);
          lines.push(
            `  ${String(accuracy).padStart(3)}m ${c.label.padStart(3)} | ` +
              `${`${r.departed.toFixed(0)}m 進んでから`.padStart(18)} | ` +
              `${`${r.approaching.toFixed(0)}m 手前`.padStart(11)} (${r.idealApproach.toFixed(0)}m) | ` +
              `${`${r.arrived.toFixed(0)}m 手前`.padStart(10)} (${r.idealArrive.toFixed(0)}m) n=${r.n}`
          );
        }
      }
      console.log(lines.join('\n'));
    });
  }

  // 回帰: αを配信間隔で正規化していないと、Δtが倍になると追従遅れも倍になり、
  // 到着判定(=LineBoardの区間進行)が駅の直前まで遅れる(#6916)。
  // 片町線快速は駅間2.3km・95km/hで、到着圏が最小クランプに張り付く最も不利な条件。
  it('片町線快速で到着判定が配信間隔に依存しない', () => {
    const track = parseGpx('gpx/KatamachiRapid.gpx');
    const stops = findStops(track);
    const accuracy = 60;

    const at5s = measureTransitions(
      track,
      stops,
      runPipeline(track, 5000, accuracy),
      accuracy
    );
    const at10s = measureTransitions(
      track,
      stops,
      runPipeline(track, 10000, accuracy),
      accuracy
    );

    // 正規化前は10秒間隔で2m手前まで落ち込んでいた
    expect(at10s.arrived).toBeGreaterThan(150);
    // 5秒と10秒で到着位置がほとんど変わらないこと
    expect(Math.abs(at10s.arrived - at5s.arrived)).toBeLessThan(50);
    // 「まもなく」も同様に間隔へ依存しないこと
    expect(at10s.approaching).toBeGreaterThan(800);
    expect(Math.abs(at10s.approaching - at5s.approaching)).toBeLessThan(100);
  });

  // 間隔で正規化するとΔtが大きいときのαが上がり、スムージングは弱くなる。
  // 測位ノイズが素通りして到着判定がばたつかないことを確かめる。
  it.each([30, 60, 250])(
    '精度%dmのノイズを乗せても到着判定が区間内で複数回立たない',
    (accuracy) => {
      const track = parseGpx('gpx/KatamachiRapid.gpx');
      const stops = findStops(track);
      const samples = runPipeline(track, 10000, accuracy, accuracy);
      expect(countArrivalChatter(stops, samples, accuracy)).toBe(1);
    }
  );
});
