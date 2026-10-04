import { type Station, StopCondition } from '~/@types/graphql';
import { ARRIVED_MAX_THRESHOLD } from '~/constants';
import { getAccuracyBonus } from './accuracyBonus';
import { findPassedStation } from './passedStation';
import { createStation } from './test/factories';
import {
  METERS_PER_DEG_LAT,
  makeNoise,
  parseGpx,
  type TrackPoint,
  trackDistance,
  truthAt,
} from './test/gpxTrack';

// 東北新幹線 盛岡→仙台(最高320km/h)。一ノ関だけに停車し、5駅を通過する。
// 駅の座標はGPXの軌跡上で各駅に最も近い点を使う(GPXは駅の座標を通るよう生成されている)。
const STATIONS: { name: string; index: number; pass: boolean }[] = [
  { name: '盛岡', index: 0, pass: false },
  { name: '新花巻', index: 416, pass: true },
  { name: '北上', index: 579, pass: true },
  { name: '水沢江刺', index: 777, pass: true },
  { name: '一ノ関', index: 1159, pass: false },
  { name: 'くりこま高原', index: 1428, pass: true },
  { name: '古川', index: 1673, pass: true },
  { name: '仙台', index: 2131, pass: false },
];

// 背景ではiOSが約10秒ぶんの測位をまとめて届け、index.js はその最後の1点だけを使う
const BATCH_INTERVAL_MS = 10_000;
const ACCURACY = 10;
// 通過駅をこの距離だけ過ぎても現在駅が手前に残っていたら、取りこぼしとみなす
const MAX_LAG_METERS = 2_000;

const track = parseGpx('assets/gpx/SampleTohokuShinkansen.gpx');

const stations: Station[] = STATIONS.map(({ index, pass }, i) =>
  createStation(i + 1, {
    latitude: track[index].lat,
    longitude: track[index].lon,
    stopCondition: pass ? StopCondition.Not : StopCondition.All,
  })
);

// 軌跡に沿った累積距離(m)
const cumulative = track.reduce<number[]>((acc, p, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + trackDistance(track[i - 1], p));
  return acc;
}, []);

const alongTrackAt = (t: number): number => {
  const i = track.findIndex((p) => p.t > t);
  if (i <= 0) {
    return i === 0 ? 0 : cumulative[cumulative.length - 1];
  }
  const a = track[i - 1];
  const b = track[i];
  return (
    cumulative[i - 1] +
    (cumulative[i] - cumulative[i - 1]) * ((t - a.t) / (b.t - a.t))
  );
};

const stationAlongTrack = STATIONS.map(({ index }) => cumulative[index]);
const arrivedRadius = ARRIVED_MAX_THRESHOLD + getAccuracyBonus(ACCURACY);

/**
 * useRefreshStation の現在駅の更新を、測位をまとめて受け取る間隔で再現する。
 * 最寄り駅の到着圏に入ればその駅へ、入らなければ(withPassedStationのとき)通り過ぎた
 * 通過駅へ進める。
 */
const ride = (phaseMs: number, withPassedStation: boolean) => {
  const noise = makeNoise(phaseMs + 1);
  let current: Station = stations[0];
  const samples: { along: number; currentIndex: number }[] = [];
  // 通過駅の推定で現在駅を進めた瞬間の、進めた先の駅と実際の位置
  const advances: { stationIndex: number; along: number }[] = [];

  for (
    let t = track[0].t + phaseMs;
    t <= track[track.length - 1].t;
    t += BATCH_INTERVAL_MS
  ) {
    const truth: TrackPoint = truthAt(track, t);
    const latitude =
      truth.lat + ((noise() - 0.5) * 2 * ACCURACY) / METERS_PER_DEG_LAT;
    const longitude =
      truth.lon +
      ((noise() - 0.5) * 2 * ACCURACY) /
        (METERS_PER_DEG_LAT * Math.cos((truth.lat * Math.PI) / 180));
    const position = { lat: latitude, lon: longitude };
    const along = alongTrackAt(t);

    const arrived = stations.find(
      (s) =>
        trackDistance(position, {
          lat: s.latitude as number,
          lon: s.longitude as number,
        }) <= arrivedRadius
    );
    if (arrived) {
      current = arrived;
    } else if (withPassedStation) {
      const passed = findPassedStation(
        stations,
        current,
        latitude,
        longitude,
        ACCURACY
      );
      if (passed && passed !== current) {
        current = passed;
        advances.push({ stationIndex: stations.indexOf(passed), along });
      }
    }

    samples.push({ along, currentIndex: stations.indexOf(current) });
  }
  return { samples, advances };
};

// 現在地より手前にある駅のうち、MAX_LAG_METERS 以上前に通り過ぎた最後の駅
const lastClearlyPassedIndex = (along: number): number =>
  stationAlongTrack.reduce(
    (last, d, i) => (d + MAX_LAG_METERS <= along ? i : last),
    0
  );

const PHASES = Array.from({ length: 10 }, (_, i) => i * 1_000);

describe('findPassedStation (SampleTohokuShinkansen.gpx)', () => {
  it('前提: 到着判定だけでは、背景の配信間隔で通過駅を取りこぼす', () => {
    const lagged = PHASES.filter((phase) =>
      ride(phase, false).samples.some(
        (s) => s.currentIndex < lastClearlyPassedIndex(s.along)
      )
    );
    expect(lagged.length).toBeGreaterThan(0);
  });

  it.each(PHASES)(
    '配信の位相 %ims: 通過駅を過ぎて2km以内に現在駅が追いつく',
    (phase) => {
      for (const s of ride(phase, true).samples) {
        expect(s.currentIndex).toBeGreaterThanOrEqual(
          lastClearlyPassedIndex(s.along)
        );
      }
    }
  );

  it.each(PHASES)(
    '配信の位相 %ims: 通過駅は実際に通り過ぎてから進める',
    (phase) => {
      const { advances } = ride(phase, true);
      expect(advances.length).toBeGreaterThan(0);
      for (const a of advances) {
        expect(STATIONS[a.stationIndex].pass).toBe(true);
        expect(stationAlongTrack[a.stationIndex]).toBeLessThan(a.along);
      }
    }
  );
});
