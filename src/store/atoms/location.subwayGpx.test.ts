/**
 * 地下鉄の電波環境を記録したGPX(--signal-profile subway)を、記録されたまま
 * setLocation の実パイプラインへ流す。
 *
 * location.gpxEtaAssist.test.ts のスイープは「GPXは真の軌跡だけを供給し、精度と
 * 配信間隔はテストが振る」前提で等間隔に再サンプルするため、GPXが持つ欠測は補間で
 * 消え、記録された精度も使われない。電波環境そのものが被検体になるこのケースは
 * そちらでは測れないので、ここで別に受け持つ。
 *
 * 見ているのは2つ。
 *  1. フィクスチャが主張どおりの電波環境であること(地上帯・ホーム帯・坑口帯が揃い、
 *     ETA棄却の保険(90秒)を超える欠測を含む)。生成条件を変えて作り直したときに、
 *     地下鉄の検証に使えないトラックへ静かに置き換わるのを防ぐ。
 *  2. そのトラックが setLocation の地下鉄分岐(skipSmoothing)を実際に踏むこと。
 *     踏まないトラックを置いても、地下鉄まわりの回帰は何も捕まらない。
 */
import { LineType, type Station } from '~/@types/graphql';
import { BAD_ACCURACY_THRESHOLD } from '~/constants/threshold';
import {
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
  getMaxPermitAccuracy: () => 1500,
  isForceNotArrivedOnLowAccuracyEnabled: () => true,
}));

const GPX = 'assets/gpx/FLinerSeibu.gpx';

// src/store/atoms/location.ts の ETA_BOUND_MAX_HOLD_MS と同値(非公開)。
// 棄却の保険が解けるまでの時間で、地下鉄の欠測がこれを超えるかどうかが
// 「発車を観測できないまま次の停車駅で測位が復活する」ケースの分かれ目になる。
const ETA_BOUND_MAX_HOLD_MS = 90_000;

const track = parseGpx(GPX);

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
const replay = (lineType: LineType): boolean[] => {
  resetLocationState();
  setLineType(lineType);
  return track.map((p) => {
    setLocation(toLocation(p, p.accuracy ?? 8));
    const out = store.get(locationAtom);
    return out?.coords.latitude === p.lat && out?.coords.longitude === p.lon;
  });
};

/**
 * 「平滑化を飛ばしたかどうかを座標から判定できる」点だけを選ぶ。条件は3つ。
 *
 * - 直前の点から1秒以内: 測位が長く途切れると基準が古い(STALE_REFERENCE_MS)と
 *   判断されて基準の張り直しが走り、そこでも locationAtom には生の座標が入る。
 *   欠測明けの1点目は地下鉄分岐と区別が付かないので外す。
 * - 直前から動いている: 止まったままの点はEMAが同じ座標へ収束しているため、
 *   平滑化してもしなくても出力が一致してしまい判定に使えない。
 * - 精度が BAD_ACCURACY_THRESHOLD 超: isAccuracyStable が false になる帯。
 *   ここが地下鉄分岐の入口になる。
 */
const denseDegradedIndices = (points: TrackPoint[]): number[] =>
  points.reduce<number[]>((acc, p, i) => {
    const prev = points[i - 1];
    if (
      i > 0 &&
      p.t - prev.t <= 1_000 &&
      (p.lat !== prev.lat || p.lon !== prev.lon) &&
      (p.accuracy ?? 0) > BAD_ACCURACY_THRESHOLD
    ) {
      acc.push(i);
    }
    return acc;
  }, []);

afterEach(() => {
  jest.clearAllMocks();
});

describe(`${GPX} の電波環境`, () => {
  it('点ごとの精度を持ち、地上帯・ホーム帯・坑口帯が揃っている', () => {
    expect(hasRecordedAccuracy(track)).toBe(true);
    const accuracies = track.map((p) => p.accuracy ?? Number.NaN);
    expect(accuracies.every(Number.isFinite)).toBe(true);

    // 地上(GPS)・地下駅のホーム(Wi-Fi/基地局)・坑口付近(基地局のみ)。
    // 坑口帯が BAD_ACCURACY_THRESHOLD を超えていることが、地下鉄分岐へ入る条件。
    expect(accuracies.filter((a) => a <= 20).length).toBeGreaterThan(0);
    expect(accuracies.filter((a) => a > 20 && a <= 60).length).toBeGreaterThan(
      0
    );
    expect(
      accuracies.filter((a) => a > BAD_ACCURACY_THRESHOLD).length
    ).toBeGreaterThan(0);
    // 精度フィルタ(getMaxPermitAccuracy)で捨てられる帯は含めない。
    // 含めると測位が届かないのと区別が付かなくなる。
    expect(Math.max(...accuracies)).toBeLessThan(1500);
  });

  it('ETA棄却の保険(90秒)を超える欠測を含む', () => {
    const gaps = track
      .slice(1)
      .map((p, i) => p.t - track[i].t)
      .filter((gap) => gap > 1_000);
    expect(gaps.length).toBeGreaterThan(0);
    expect(Math.max(...gaps)).toBeGreaterThan(ETA_BOUND_MAX_HOLD_MS);
  });

  it('地上区間は欠測せず連続して届く', () => {
    // 地上帯(<=20m)の点が1秒間隔で並んでいること。ここが穴だらけだと、
    // 地下から地上へ復帰したあとの基準の張り直しを観測できない。
    const surfaceRuns = track.filter(
      (p, i) =>
        i > 0 && (p.accuracy ?? 0) <= 20 && p.t - track[i - 1].t <= 1_000
    );
    expect(surfaceRuns.length).toBeGreaterThan(100);
  });
});

describe('地下鉄の電波環境を流したときの setLocation の分岐', () => {
  it('lineTypeがSubwayなら、精度が劣化した連続区間で平滑化を飛ばす', () => {
    const degraded = denseDegradedIndices(track);
    expect(degraded.length).toBeGreaterThan(50);

    const subway = replay(LineType.Subway);
    // 劣化帯が続くあいだ accuracyHistory は不安定と判定され続けるので、
    // 該当区間は全点が生のまま通る。
    expect(degraded.filter((i) => subway[i]).length).toBe(degraded.length);
  });

  it('同じトラックでもlineTypeがSubwayでなければ平滑化される', () => {
    const degraded = denseDegradedIndices(track);
    const normal = replay(LineType.Normal);
    // 地下鉄分岐を通らない側では、同じ点が EMA なり速度フィルタなりを必ず経由する。
    expect(normal.filter((i, idx) => i && degraded.includes(idx)).length).toBe(
      0
    );
  });
});
