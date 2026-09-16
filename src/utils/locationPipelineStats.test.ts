import type * as Location from 'expo-location';
import {
  countAcceptedLocation,
  countLocationRejectedAsDuplicate,
  countLocationRejectedByAccuracy,
  countLocationRejectedByEta,
  countLocationRejectedBySpeed,
  getLocationInputDisplacementHistory,
  getLocationPipelineCounts,
  recordLocationInput,
  resetLocationPipelineStats,
} from './locationPipelineStats';

const makeLocation = (
  latitude: number,
  longitude: number
): Location.LocationObject =>
  ({
    coords: { latitude, longitude, accuracy: 15 },
    timestamp: 1_700_000_000_000,
  }) as Location.LocationObject;

// 都営大江戸線 豊島園 / 練馬春日町。実測の飛び幅に近い距離で検証する
const TOSHIMAEN = { latitude: 35.742567043044, longitude: 139.64894845621 };
const NERIMA_KASUGACHO = { latitude: 35.751452, longitude: 139.640236 };

describe('locationPipelineStats', () => {
  beforeEach(() => {
    resetLocationPipelineStats();
  });

  it('処理結果を門ごとに数える', () => {
    countAcceptedLocation();
    countAcceptedLocation();
    countLocationRejectedByAccuracy();
    countLocationRejectedAsDuplicate();
    countLocationRejectedAsDuplicate();
    countLocationRejectedAsDuplicate();
    countLocationRejectedByEta();
    countLocationRejectedBySpeed();

    expect(getLocationPipelineCounts()).toEqual({
      accepted: 2,
      rejectedByAccuracy: 1,
      rejectedAsDuplicate: 3,
      rejectedByEta: 1,
      rejectedBySpeed: 1,
    });
  });

  it('返した集計を書き換えても内部状態は壊れない', () => {
    // 診断表示へ渡した値が、あとから集計そのものを動かせてはいけない
    countAcceptedLocation();
    const counts = getLocationPipelineCounts();
    counts.accepted = 999;

    expect(getLocationPipelineCounts().accepted).toBe(1);
  });

  it('最初の1件は基準が無いので飛び幅を積まない', () => {
    recordLocationInput(makeLocation(TOSHIMAEN.latitude, TOSHIMAEN.longitude));

    expect(getLocationInputDisplacementHistory()).toEqual([]);
  });

  it('連続する入力の距離を積む', () => {
    recordLocationInput(makeLocation(TOSHIMAEN.latitude, TOSHIMAEN.longitude));
    recordLocationInput(
      makeLocation(NERIMA_KASUGACHO.latitude, NERIMA_KASUGACHO.longitude)
    );

    const history = getLocationInputDisplacementHistory();
    expect(history).toHaveLength(1);
    // 豊島園-練馬春日町 はおよそ 1.26km
    expect(history[0]).toBeGreaterThan(1200);
    expect(history[0]).toBeLessThan(1330);
  });

  it('棄却された測位も基準を更新するので、次の距離が隣り合う入力同士になる', () => {
    // 受理された座標だけを並べると、棄却を挟んだ区間の距離が実際より大きく出る
    recordLocationInput(makeLocation(TOSHIMAEN.latitude, TOSHIMAEN.longitude));
    recordLocationInput(
      makeLocation(NERIMA_KASUGACHO.latitude, NERIMA_KASUGACHO.longitude)
    );
    recordLocationInput(
      makeLocation(NERIMA_KASUGACHO.latitude, NERIMA_KASUGACHO.longitude)
    );

    expect(getLocationInputDisplacementHistory()[1]).toBe(0);
  });

  it('飛び幅の履歴は12件で頭打ちになる', () => {
    // 精度履歴(MAX_ACCURACY_HISTORY)と同じ長さに揃え、同じ時間幅を見ているようにする
    for (let i = 0; i < 20; i += 1) {
      recordLocationInput(makeLocation(35.7 + i * 0.001, 139.6));
    }

    expect(getLocationInputDisplacementHistory()).toHaveLength(12);
  });

  it('リセットで集計と履歴の両方が初期化される', () => {
    countAcceptedLocation();
    recordLocationInput(makeLocation(TOSHIMAEN.latitude, TOSHIMAEN.longitude));
    recordLocationInput(
      makeLocation(NERIMA_KASUGACHO.latitude, NERIMA_KASUGACHO.longitude)
    );

    resetLocationPipelineStats();

    expect(getLocationPipelineCounts().accepted).toBe(0);
    expect(getLocationInputDisplacementHistory()).toEqual([]);
    // 基準も落ちるので、リセット直後の1件目は積まれない
    recordLocationInput(makeLocation(TOSHIMAEN.latitude, TOSHIMAEN.longitude));
    expect(getLocationInputDisplacementHistory()).toEqual([]);
  });
});
