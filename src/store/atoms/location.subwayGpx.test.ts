/**
 * 地下鉄の電波環境を記録したGPX(--signal-profile subway)を、記録されたまま
 * setLocation の実パイプラインへ流す。
 *
 * location.gpxEtaAssist.test.ts のスイープは「GPXは真の軌跡だけを供給し、精度と
 * 配信間隔はテストが振る」前提で等間隔に再サンプルするため、GPXが持つ欠測は補間で
 * 消え、記録された精度も使われない。電波環境そのものが被検体になるこのケースは
 * そちらでは測れないので、ここで別に受け持つ。
 *
 * 対象は「点ごとの精度を持つGPX」を動的に集める。gpxEtaAssist 側が
 * 「精度を持たないGPX」を集めているので、2つで assets/gpx 配下を分割して覆う。
 * どちらかにファイル名を直書きすると、追加したGPXがどのテストにも載らないまま
 * 静かに素通りする。
 *
 * 見ているのは3つ。
 *  1. フィクスチャが主張どおりの電波環境であること。生成条件を変えて作り直したときに、
 *     地下鉄の検証に使えないトラックへ静かに置き換わるのを防ぐ。
 *  2. そのトラックが setLocation の地下鉄分岐(skipSmoothing)に実際に入ること。
 *  3. 地上へ出たらその分岐から抜けること。入口だけ見ていると、分岐が解けなくなる
 *     回帰(地上でも生の座標が出続ける)を捕まえられない。
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { LineType, type Station } from '~/@types/graphql';
import { MAX_PERMIT_ACCURACY } from '~/constants/location';
import { BAD_ACCURACY_THRESHOLD } from '~/constants/threshold';
import {
  GPX_DIR,
  hasRecordedAccuracy,
  parseGpx,
  type TrackPoint,
  toLocation,
} from '~/utils/test/gpxTrack';
import { store } from '..';
import { locationAtom, resetLocationState, setLocation } from './location';
import stationState from './station';

// ETA補助は既定で無効。ここで測りたいのは電波環境による分岐だけなので、
// ETAによる棄却(#6939)が混ざらないよう無効のまま流す。
jest.mock('~/lib/remoteConfig', () => ({
  isEtaAssistEnabled: () => false,
  getEtaFallbackArrivalConfirmMarginSec: () => 30,
  // jest.mock のファクトリはスコープ外の変数を参照できないため、ここでだけ
  // 遅延 require する。定数の二重管理を避けるのが目的。
  getMaxPermitAccuracy: () =>
    jest.requireActual('~/constants/location').MAX_PERMIT_ACCURACY,
  isForceNotArrivedOnLowAccuracyEnabled: () => true,
}));

// src/store/atoms/location.ts の同名の非公開定数と同値。export されていないので
// ここで持つが、値がずれると下のアサーションの意味が変わるため目視で同期する。
//
// ETA_BOUND_MAX_HOLD_MS: ETAによる棄却の保険が解けるまでの時間。地下鉄の欠測が
//   これを超えるかどうかが「発車を観測できないまま次の停車駅で測位が復活する」
//   ケースの分かれ目になる。
// MAX_ACCURACY_HISTORY: isAccuracyStable が見る精度履歴の長さ。地上へ出てから
//   坑口帯の値がこの点数ぶんで履歴から押し出される。
const ETA_BOUND_MAX_HOLD_MS = 90_000;
const MAX_ACCURACY_HISTORY = 12;

// 生成側(scripts/generate-location-gpx.mjs の SIGNAL_PROFILES.subway)の帯。
const SURFACE_MAX_ACCURACY = 20;
const PLATFORM_MAX_ACCURACY = 60;

/** 点ごとの精度を持つGPX。gpxEtaAssist 側の補集合になる */
const GPX_FILES = readdirSync(join(process.cwd(), GPX_DIR))
  .filter((f) => f.endsWith('.gpx'))
  .filter((f) => hasRecordedAccuracy(parseGpx(join(GPX_DIR, f))))
  .sort();

const setLineType = (lineType: LineType) => {
  store.set(stationState, {
    ...store.get(stationState),
    station: { line: { lineType } } as Station,
    stations: [],
  });
};

/**
 * トラックを流し、各点で locationAtom が「入力そのもの」になったかを返す。
 *
 * setLocation は地下鉄分岐に入ると平滑化も速度フィルタも掛けずに生の座標を
 * locationAtom へ入れる。EMAが掛かれば値は必ずずれ、速度フィルタで棄却されれば
 * 前回値のまま止まるので、どちらでもない「入力と完全一致」が分岐の目印になる。
 */
const replay = (track: TrackPoint[], lineType: LineType): boolean[] => {
  resetLocationState();
  setLineType(lineType);
  return track.map((p) => {
    setLocation(toLocation(p, p.accuracy ?? 8));
    const out = store.get(locationAtom);
    return out?.coords.latitude === p.lat && out?.coords.longitude === p.lon;
  });
};

/**
 * 「平滑化を飛ばしたかどうかを座標から判定できる」点か。条件は2つ。
 *
 * - 直前の点から1秒以内: 測位が長く途切れると基準が古い(STALE_REFERENCE_MS)と
 *   判断されて基準の張り直しが走り、そこでも locationAtom には生の座標が入る。
 *   欠測明けの1点目は地下鉄分岐と区別が付かないので外す。
 * - 直前から動いている: 止まったままの点はEMAが同じ座標へ収束しているため、
 *   平滑化してもしなくても出力が一致してしまい判定に使えない。
 */
const isDecidable = (points: TrackPoint[], i: number): boolean => {
  if (i === 0) return false;
  const prev = points[i - 1];
  const p = points[i];
  return p.t - prev.t <= 1_000 && (p.lat !== prev.lat || p.lon !== prev.lon);
};

/** 判定可能かつ精度が BAD_ACCURACY_THRESHOLD 超の点。地下鉄分岐の入口の帯 */
const denseDegradedIndices = (points: TrackPoint[]): number[] =>
  points.reduce<number[]>((acc, p, i) => {
    if (isDecidable(points, i) && (p.accuracy ?? 0) > BAD_ACCURACY_THRESHOLD) {
      acc.push(i);
    }
    return acc;
  }, []);

/**
 * 判定可能かつ精度が地上帯の点を、連続した区間(ラン)としてまとめる。
 * 前後どちらも地上帯であることを要求するので、劣化点と交互に並んだ列は
 * ランにならない。
 */
const denseSurfaceRuns = (points: TrackPoint[]): number[][] => {
  const runs: number[][] = [];
  let current: number[] = [];
  for (let i = 1; i < points.length; i += 1) {
    const inRun =
      isDecidable(points, i) &&
      (points[i].accuracy ?? Number.POSITIVE_INFINITY) <=
        SURFACE_MAX_ACCURACY &&
      (points[i - 1].accuracy ?? Number.POSITIVE_INFINITY) <=
        SURFACE_MAX_ACCURACY;
    if (inRun) {
      current.push(i);
    } else if (current.length > 0) {
      runs.push(current);
      current = [];
    }
  }
  if (current.length > 0) runs.push(current);
  return runs;
};

/** 欠測(1秒を超える <time> の穴)の長さ(ms) */
const gapsOf = (points: TrackPoint[]): number[] =>
  points
    .slice(1)
    .map((p, i) => p.t - points[i].t)
    .filter((gap) => gap > 1_000);

afterEach(() => {
  jest.clearAllMocks();
});

describe('点ごとの精度を持つGPXの集合', () => {
  it('1本以上あり、地下鉄のフィクスチャを含む', () => {
    // gpxEtaAssist 側は精度を持たないGPXだけを流すので、ここが空になると
    // 電波環境を持つトラックがどのテストからも漏れる。
    expect(GPX_FILES.length).toBeGreaterThan(0);
    expect(GPX_FILES).toContain('FLinerSeibu.gpx');
  });
});

describe.each(GPX_FILES)('%s の電波環境', (file) => {
  const track = parseGpx(join(GPX_DIR, file));

  it('地上帯・ホーム帯・坑口帯が揃い、精度フィルタの上限を超えない', () => {
    const accuracies = track.map((p) => p.accuracy ?? Number.NaN);
    expect(accuracies.every(Number.isFinite)).toBe(true);

    // 地上(GPS)・地下駅のホーム(Wi-Fi/基地局)・坑口付近(基地局のみ)。
    // 坑口帯が BAD_ACCURACY_THRESHOLD を超えていることが、地下鉄分岐へ入る条件。
    expect(
      accuracies.filter((a) => a <= SURFACE_MAX_ACCURACY).length
    ).toBeGreaterThan(0);
    expect(
      accuracies.filter(
        (a) => a > SURFACE_MAX_ACCURACY && a <= PLATFORM_MAX_ACCURACY
      ).length
    ).toBeGreaterThan(0);
    expect(
      accuracies.filter((a) => a > BAD_ACCURACY_THRESHOLD).length
    ).toBeGreaterThan(0);
    // 精度フィルタ(getMaxPermitAccuracy)で捨てられる帯は含めない。
    // 含めると測位が届かないのと区別が付かなくなる。
    expect(Math.max(...accuracies)).toBeLessThan(MAX_PERMIT_ACCURACY);
  });

  it('ETA棄却の保険(90秒)を超える欠測を含む', () => {
    const gaps = gapsOf(track);
    expect(gaps.length).toBeGreaterThan(0);
    expect(Math.max(...gaps)).toBeGreaterThan(ETA_BOUND_MAX_HOLD_MS);
  });

  it('地下から地上への復帰を含み、地上区間は連続して届く', () => {
    // 地上帯の点が1秒間隔で「連続して」並んでいること。合計点数ではなく
    // 最長ランを見るのは、劣化点と交互に並んだ列でも合計は積み上がるため。
    const runs = denseSurfaceRuns(track);
    expect(runs.length).toBeGreaterThan(0);
    expect(Math.max(...runs.map((r) => r.length))).toBeGreaterThan(
      MAX_ACCURACY_HISTORY * 4
    );
  });

  it('lineTypeがSubwayなら、精度が劣化した連続区間で平滑化を飛ばす', () => {
    const degraded = denseDegradedIndices(track);
    expect(degraded.length).toBeGreaterThan(50);

    const subway = replay(track, LineType.Subway);
    // 劣化帯が続くあいだ accuracyHistory は不安定と判定され続けるので、
    // 該当区間は全点が生のまま通る。
    expect(degraded.filter((i) => subway[i]).length).toBe(degraded.length);
  });

  it('lineTypeがSubwayでも、地上へ出れば平滑化へ戻る', () => {
    // 分岐の「出口」。地上帯に入ると accuracyHistory から坑口帯の値が押し出され、
    // isAccuracyStable が true に戻ってスムージングが復活する。履歴が入れ替わる
    // までの MAX_ACCURACY_HISTORY 点は判定できないので各ランの先頭から除く。
    const subway = replay(track, LineType.Subway);
    const tails = denseSurfaceRuns(track)
      .map((run) => run.slice(MAX_ACCURACY_HISTORY))
      .filter((run) => run.length > 0);
    expect(tails.length).toBeGreaterThan(0);
    const rawInSurface = tails.flat().filter((i) => subway[i]);
    expect(rawInSurface).toEqual([]);
  });

  it('同じトラックでもlineTypeがSubwayでなければ平滑化される', () => {
    const degraded = denseDegradedIndices(track);
    const normal = replay(track, LineType.Normal);
    // 地下鉄分岐を通らない側では、同じ点が EMA なり速度フィルタなりを必ず経由する。
    expect(normal.filter((i, idx) => i && degraded.includes(idx)).length).toBe(
      0
    );
  });
});

/**
 * FLinerSeibu.gpx 固有の形。上の describe.each は「電波環境を持つGPX」なら
 * どれでも成り立つ性質しか見ないので、生成オプションを落として作り直したときに
 * 気づけるよう、このフィクスチャの実測値をここで固定する。
 *
 * たとえば --subway-lines を落とすと、みなとみらい線・西武有楽町線が地上扱いに
 * なって地下↔地上の復帰が 2 回から 1 回へ減るが、副都心線区間だけで 3 帯と
 * 90 秒超の欠測が揃うため上の共通アサーションは全部通ってしまう。
 */
describe('FLinerSeibu.gpx の形', () => {
  const track = parseGpx(join(GPX_DIR, 'FLinerSeibu.gpx'));

  it('欠測は7件、うち4件がETA棄却の保険を超える', () => {
    const gaps = gapsOf(track);
    expect(gaps.length).toBe(7);
    expect(gaps.filter((g) => g > ETA_BOUND_MAX_HOLD_MS).length).toBe(4);
    expect(Math.max(...gaps)).toBe(195_000);
  });

  it('地下から地上への復帰を2回含む', () => {
    // 地下(みなとみらい線)→地上(東横線)→地下(副都心線・西武有楽町線)→地上(西武池袋線)。
    // 副都心線→西武有楽町線は地下から地下なので切り替わりに数えない。
    const bands = track
      .map((p) =>
        (p.accuracy ?? 0) <= SURFACE_MAX_ACCURACY ? 'surface' : 'underground'
      )
      .filter((band, i, all) => i === 0 || band !== all[i - 1]);
    expect(bands).toEqual(['underground', 'surface', 'underground', 'surface']);
  });
});
