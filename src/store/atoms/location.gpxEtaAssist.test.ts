/**
 * eta_assist_enabled = true を前提に、assets/gpx 配下の**全**GPXを setLocation の実パイプラインへ
 * 流し、ETA補助を有効化しても走行結果が変わらないことを確かめる。
 *
 * ETA補助がパイプラインへ介入する経路は、ETAが許す進行量を超えた測位の棄却
 * (#6939 / store/atoms/location.ts)だけである。到着圏を緩和するR1(#6366)は、有効化して
 * 実走させたところ到着判定を悪化させたため廃止した。サーバー配信のマスタースイッチ一つで
 * 全ユーザーへ有効化されるため、「正常な走行では何も変えない」ことが有効化の前提条件
 * になる。棄却が働く側の挙動は合成データで location.etaBound.test.ts が受け持つので、
 * ここでは実トラックでの非干渉性（平滑後の軌跡と到着検知位置がフラグON/OFFで一致すること）
 * を測る。
 *
 * アンカー(etaAnchorAtom)はGPSの到着・発車検知に追従する閉ループにしている。
 * useRefreshStation の到着判定と useEtaAnchor の打刻を最小構成で再現することで、
 * ETAの仮想時計が本番と同じ経路で進む。
 *
 * 経路(stationState.stations)はGPXから検出した停車駅だけで構成する。本番の stations は
 * 通過駅も含むので進行量の刻みは本番のほうが細かく、同じ距離のずれでも本番は
 * ここより棄却が起きやすい側に寄る。
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { LineType, type Station } from '~/@types/graphql';
import {
  ARRIVED_MAX_THRESHOLD,
  ARRIVED_MIN_THRESHOLD,
  BAD_ACCURACY_THRESHOLD,
} from '~/constants/threshold';
import { getEtaPhaseNow } from '~/utils/etaPhaseNow';
import {
  clamp,
  findStops,
  GPX_DIR,
  METERS_PER_DEG_LAT,
  makeNoise,
  median,
  parseGpx,
  type TrackPoint,
  type TrackStop,
  toLocation,
  trackDistance,
  truthAt,
} from '~/utils/test/gpxTrack';
import { store } from '..';
import { etaAnchorAtom, etaStopsAtom } from './etaFallback';
import { locationAtom, resetLocationState, setLocation } from './location';
import stationState from './station';

// ETA補助は既定で無効(remoteConfigのフォールバックがfalse)なので、有効・無効を
// 切り替えられるようにしてフラグ間の差分を測る。
let mockEtaAssistEnabled = true;
jest.mock('~/lib/remoteConfig', () => ({
  isEtaAssistEnabled: () => mockEtaAssistEnabled,
  getEtaFallbackArrivalConfirmMarginSec: () => 30,
  getMaxPermitAccuracy: () => 1500,
  isForceNotArrivedOnLowAccuracyEnabled: () => true,
}));

// useRefreshStation のプライベート定数と同値。到着圏へ加える精度ボーナスの上限(m)。
const MAX_ACCURACY_BONUS = 150;

type Condition = {
  label: string;
  accuracy: number;
  intervalMs: number;
  /** 入力座標へ乗せる正規分布ノイズのσ(m)。0でノイズなし */
  noiseSigma: number;
};

// gpxLag と同じ精度・間隔の帯に加え、精度劣化帯(BAD_ACCURACY_THRESHOLD=200m超)を含める。
// 劣化帯ではEMAが固定αになり追従遅れが最大になるため、ETAの進行量上限から外れやすい。
// 600mはMAX_PERMIT_ACCURACY(1500m)の範囲内なので、フィルタを通ってsetLocationまで届く
// 現実的な値。
const CONDITIONS: Condition[] = [
  { label: ' 30m/ 5s', accuracy: 30, intervalMs: 5_000, noiseSigma: 0 },
  { label: ' 30m/10s', accuracy: 30, intervalMs: 10_000, noiseSigma: 0 },
  { label: ' 60m/10s', accuracy: 60, intervalMs: 10_000, noiseSigma: 0 },
  { label: '250m/10s', accuracy: 250, intervalMs: 10_000, noiseSigma: 0 },
  { label: '600m/10s', accuracy: 600, intervalMs: 10_000, noiseSigma: 0 },
  {
    label: '250m/10s σ250m',
    accuracy: 250,
    intervalMs: 10_000,
    noiseSigma: 250,
  },
];

const GPX_FILES = readdirSync(join(process.cwd(), GPX_DIR))
  .filter((f) => f.endsWith('.gpx'))
  .sort();

const stationIdOf = (stopIndex: number) => stopIndex + 1;

/** 検出した停車駅を、そのまま経路上の駅として扱う */
const buildStations = (stops: TrackStop[]): Station[] =>
  stops.map(
    (s, i) =>
      ({
        id: stationIdOf(i),
        latitude: s.anchor.lat,
        longitude: s.anchor.lon,
      }) as Station
  );

const setupRoute = (stops: TrackStop[]) => {
  store.set(stationState, {
    arrived: true,
    approaching: false,
    // 地下鉄はスムージング自体をスキップするため、地上路線として流す
    station: { line: { lineType: LineType.Normal } } as Station,
    stations: buildStations(stops),
    stationsCache: [],
    pendingStation: null,
    pendingStations: [],
    selectedDirection: null,
    selectedBound: null,
    wantedDestination: null,
  });
  // ETAはGPX自身の時刻表(=ETA通りに走る列車)から作る。ETAが実際より遅い側へ
  // 外れた場合の棄却は location.etaBound.test.ts が受け持つ。
  const t0 = stops[0].departAt;
  store.set(
    etaStopsAtom,
    stops.map((s, i) => ({
      stationId: stationIdOf(i),
      cumulativeMinutes: (s.arriveAt - t0) / 60_000,
      departureCumulativeMinutes: (s.departAt - t0) / 60_000,
    }))
  );
};

type ReplayResult = {
  /** 平滑後の軌跡 */
  samples: TrackPoint[];
  /** 停車駅ごとの「到着検知が初めて成立した時点で駅まであと何m」。未検知はnull */
  firstDetection: (number | null)[];
  /** 測位が反映されず位置が据え置かれたサンプル数(速度フィルタ or ETA上限) */
  heldSamples: number;
  /**
   * ETA仮想時計がフェーズを返せたサンプル数。ETA補助が有効なら（アンカーと停車駅リストが
   * 揃っている＝棄却判定が実際に評価される）ほぼ全サンプルで非nullになる。ETAの配線が
   * 抜けたまま「差分なし」を確認してしまう空振りを防ぐための計測。
   */
  etaPhaseSamples: number;
};

const replay = (
  track: TrackPoint[],
  stops: TrackStop[],
  { accuracy, intervalMs, noiseSigma }: Condition
): ReplayResult => {
  resetLocationState();
  store.set(etaAnchorAtom, null);

  const noise = makeNoise(0x5eed);
  const samples: TrackPoint[] = [];
  const firstDetection: (number | null)[] = stops.map(() => null);
  let heldSamples = 0;
  let etaPhaseSamples = 0;
  // 最後に到着と判定した停車駅(useRefreshStationのstation相当)。始発駅から始まる。
  let arrivedIdx = 0;
  let prevArrived = false;

  for (let t = track[0].t; t <= track[track.length - 1].t; t += intervalMs) {
    const truth = truthAt(track, t);
    const input =
      noiseSigma > 0
        ? {
            t,
            lat: truth.lat + (noise() * noiseSigma) / METERS_PER_DEG_LAT,
            lon:
              truth.lon +
              (noise() * noiseSigma) /
                (METERS_PER_DEG_LAT * Math.cos((truth.lat * Math.PI) / 180)),
          }
        : truth;

    const before = store.get(locationAtom);
    setLocation(toLocation(input, accuracy));
    const cur = store.get(locationAtom);
    if (!cur) {
      continue;
    }
    if (cur === before) {
      heldSamples += 1;
    }
    const pos = { t, lat: cur.coords.latitude, lon: cur.coords.longitude };
    samples.push(pos);

    // ETA仮想時計のフェーズ。無効時はnullを返す(getEtaPhaseNowがフラグを見る)。
    // 本番は Date.now() で評価するが、ここではGPXの時刻で仮想時計を回す。
    const phase = getEtaPhaseNow(t);
    if (phase) {
      etaPhaseSamples += 1;
    }

    // --- useRefreshStation の到着判定(最小構成) ---
    let nearestIdx = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    stops.forEach((s, i) => {
      const d = trackDistance(pos, s.anchor);
      if (d < nearestDistance) {
        nearestDistance = d;
        nearestIdx = i;
      }
    });

    // useThreshold: 「最後に到着した駅→次の停車駅」の駅間距離から到着圏を決める
    const nextIdx = Math.min(arrivedIdx + 1, stops.length - 1);
    const between = trackDistance(
      stops[arrivedIdx].anchor,
      stops[nextIdx].anchor
    );
    const arrivedThreshold = clamp(
      between / 4,
      ARRIVED_MIN_THRESHOLD,
      ARRIVED_MAX_THRESHOLD
    );
    // 到着圏はGPS精度だけで決まる(ETAは到着判定へ介入しない)
    const arrivedRadius =
      arrivedThreshold + Math.min(accuracy * 0.5, MAX_ACCURACY_BONUS);

    const arrived = nearestDistance <= arrivedRadius;
    if (arrived && firstDetection[nearestIdx] === null) {
      // 検知時点の「真の」列車位置で測る(平滑後の座標ではなく実際の駅までの距離)
      firstDetection[nearestIdx] = trackDistance(
        truthAt(track, t),
        stops[nearestIdx].anchor
      );
    }

    // --- useEtaAnchor の打刻 ---
    if (arrived) {
      store.set(etaAnchorAtom, {
        stationId: stationIdOf(nearestIdx),
        kind: 'AT_STATION',
        observedAtMs: t,
      });
      arrivedIdx = nearestIdx;
    } else if (prevArrived) {
      store.set(etaAnchorAtom, {
        stationId: stationIdOf(arrivedIdx),
        kind: 'DEPARTED',
        observedAtMs: t,
      });
    }
    prevArrived = arrived;
  }

  return {
    samples,
    firstDetection,
    heldSamples,
    etaPhaseSamples,
  };
};

/** 2つの軌跡が初めて食い違うindex。一致していれば-1 */
const divergenceIndex = (a: TrackPoint[], b: TrackPoint[]): number => {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    if (a[i].t !== b[i].t || a[i].lat !== b[i].lat || a[i].lon !== b[i].lon) {
      return i;
    }
  }
  return a.length === b.length ? -1 : len;
};

const detectedCount = (detections: (number | null)[]) =>
  detections.filter((d) => d !== null).length;

describe('eta_assist_enabled=true でGPXを実パイプラインへ流したときの非干渉性', () => {
  it.each(GPX_FILES)('%s: ETA補助の有効・無効で走行結果が一致する', (file) => {
    const track = parseGpx(join(GPX_DIR, file));
    expect(track.length).toBeGreaterThan(100);
    const stops = findStops(track);
    expect(stops.length).toBeGreaterThan(1);
    setupRoute(stops);

    // 終着駅で静止したままトラックが終わるか(生成GPXは終着駅の停車時間を持たない)
    const endsAtStop =
      stops[stops.length - 1].departAt === track[track.length - 1].t;

    const lines: string[] = [`\n■ ${file}  停車=${stops.length}`];
    lines.push(
      '  精度/間隔       | 据え置き ON/OFF | 到着検知中央値 ON/OFF | 検知駅数 | 検知位置の差(最大)'
    );

    for (const cond of CONDITIONS) {
      mockEtaAssistEnabled = true;
      const on = replay(track, stops, cond);
      mockEtaAssistEnabled = false;
      const off = replay(track, stops, cond);

      // ETAの配線が生きていること(=棄却判定が毎サンプル実際に評価されていること)。
      // これが無いと、ETAが不発のまま「差分なし」を確認する空振りになる。
      expect(on.etaPhaseSamples).toBeGreaterThan(on.samples.length * 0.8);
      expect(off.etaPhaseSamples).toBe(0);

      // ETA上限が1点でも棄却すれば、以降の平滑後座標が分岐する
      expect(divergenceIndex(on.samples, off.samples)).toBe(-1);
      expect(on.heldSamples).toBe(off.heldSamples);
      // 到着を検知できた駅数。取りこぼしはETA以前の問題として検出する。
      // ただし精度劣化帯(固定α=0.3)は追従遅れが大きく、停車時間を持たない終着駅では
      // 遅れが解けないままトラックが終わるため検知できないことがある。
      const undetectableTerminal =
        endsAtStop && cond.accuracy > BAD_ACCURACY_THRESHOLD ? 1 : 0;
      expect(detectedCount(on.firstDetection)).toBe(
        stops.length - undetectableTerminal
      );
      // ETAは到着判定へ介入しない(棄却が起きなければ入力も到着圏も同一)ため、
      // 検知位置は一致する。R1を持っていた頃の「早まる側にだけずれる」許容ではなく、
      // 完全一致を要求してETAが到着判定へ戻ってきたことを検出できるようにする。
      on.firstDetection.forEach((d, i) => {
        expect(d).toBe(off.firstDetection[i]);
      });

      const onDetections = on.firstDetection.filter(
        (d): d is number => d !== null
      );
      const offDetections = off.firstDetection.filter(
        (d): d is number => d !== null
      );
      // ETA有効・無効で到着検知位置が何mずれたか(最大)。0なら完全一致。
      const maxDetectionDiff = Math.max(
        0,
        ...on.firstDetection.map((d, i) => {
          const o = off.firstDetection[i];
          return d === null || o === null ? 0 : Math.abs(d - o);
        })
      );
      lines.push(
        `  ${cond.label.padEnd(15)} | ` +
          `${`${on.heldSamples}/${off.heldSamples}`.padStart(15)} | ` +
          `${`${median(onDetections).toFixed(0)}m/${median(offDetections).toFixed(0)}m 手前`.padStart(21)} | ` +
          `${`${detectedCount(on.firstDetection)}/${detectedCount(off.firstDetection)}`.padStart(8)} | ` +
          `${maxDetectionDiff.toFixed(1)}m`
      );
    }
    console.log(lines.join('\n'));
  });
});
