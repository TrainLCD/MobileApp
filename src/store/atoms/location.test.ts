import type * as Location from 'expo-location';
import { LineType, type Station } from '~/@types/graphql';
import { store } from '..';
import {
  accuracyHistoryAtom,
  locationAccuracyOutlierAtom,
  locationAtom,
  rawLocationAtom,
  resetLocationState,
  setLocation,
  setRawLocation,
} from './location';
import stationState from './station';

const makeLocation = (
  lat: number,
  lon: number,
  accuracy: number,
  timestamp = Date.now()
): Location.LocationObject => ({
  coords: {
    latitude: lat,
    longitude: lon,
    accuracy,
    altitude: 0,
    altitudeAccuracy: 0,
    heading: 0,
    speed: 0,
  },
  timestamp,
});

const setStationLineType = (lineType: LineType | null) => {
  store.set(stationState, {
    arrived: true,
    approaching: false,
    station: lineType ? ({ line: { lineType } } as Station) : null,
    stations: [],
    stationsCache: [],
    pendingStation: null,
    pendingStations: [],
    selectedDirection: null,
    selectedBound: null,
    wantedDestination: null,
  });
};

describe('setLocation', () => {
  beforeEach(() => {
    resetLocationState();
    setStationLineType(null);
  });

  describe('生の測位値の記録', () => {
    it('setRawLocationはlocationAtomを更新せずrawLocationAtomへ生の値を記録する', () => {
      const loc = makeLocation(35.0, 139.0, 5000, 1000);
      setRawLocation(loc);

      // フィルタで棄却される想定の値でもrawLocationAtomには記録される
      expect(store.get(rawLocationAtom)?.coords.accuracy).toBe(5000);
      // locationAtomは更新しない（フィルタ後の値はsetLocation側が管理する）
      expect(store.get(locationAtom)).toBeNull();
    });

    it('setLocationはrawLocationAtomを更新しない（background経路のみが記録責務を持つ）', () => {
      const loc = makeLocation(35.0, 139.0, 30, 1000);
      setLocation(loc);

      // watchPositionAsync経路ではlocationAtomが生の精度を持つため、rawLocationは触らない
      expect(store.get(rawLocationAtom)).toBeNull();
      expect(store.get(locationAtom)?.coords.accuracy).toBe(30);
    });
  });

  describe('外れ値フラグの解除', () => {
    it('受理した測位を反映する際に外れ値フラグを解除する', () => {
      // 継続測位で一度立ったフラグが、direct setLocation経由の良好な測位で解除されること
      store.set(locationAccuracyOutlierAtom, true);

      const loc = makeLocation(35.0, 139.0, 30, 1000);
      setLocation(loc);

      expect(store.get(locationAccuracyOutlierAtom)).toBe(false);
      expect(store.get(locationAtom)?.coords.accuracy).toBe(30);
    });

    it('speedフィルタで座標が棄却される場合でも外れ値フラグは解除される', () => {
      // フィルタ基準となる前回値を用意する
      const first = makeLocation(35.0, 139.0, 30, 1000);
      setLocation(first);

      store.set(locationAccuracyOutlierAtom, true);

      // 1秒で遠方へジャンプ → MAX_PLAUSIBLE_SPEED超過で座標は棄却される
      const jump = makeLocation(36.0, 140.0, 30, 2000);
      setLocation(jump);

      // 座標は前回値のまま（棄却）だが、精度自体は良好なので外れ値フラグは解除される
      expect(store.get(locationAtom)?.coords.latitude).toBe(35.0);
      expect(store.get(locationAccuracyOutlierAtom)).toBe(false);
    });
  });

  describe('非地下鉄路線', () => {
    it('スムージングが適用される（座標が生の値と異なる）', () => {
      setStationLineType(LineType.Normal);

      const first = makeLocation(35.0, 139.0, 30, 1000);
      setLocation(first);

      const second = makeLocation(35.001, 139.001, 30, 4000);
      setLocation(second);

      const result = store.get(locationAtom);
      // EMAが適用されるため、生の座標(35.001)とは異なる値になるはず
      expect(result?.coords.latitude).not.toBe(35.001);
      expect(result?.coords.longitude).not.toBe(139.001);
    });
  });

  describe('地下鉄路線', () => {
    it('精度が不安定な場合はスムージングをスキップする', () => {
      setStationLineType(LineType.Subway);
      // 高い変動の精度履歴をセット
      store.set(accuracyHistoryAtom, [10, 300, 20, 400]);

      const loc = makeLocation(35.0, 139.0, 500, 1000);
      setLocation(loc);

      const result = store.get(locationAtom);
      // スキップされたので生の座標がそのまま入る
      expect(result?.coords.latitude).toBe(35.0);
      expect(result?.coords.longitude).toBe(139.0);
    });

    it('精度が安定している場合はスムージングを適用する', () => {
      setStationLineType(LineType.Subway);
      // 安定した精度履歴をセット（低CV、平均200m未満）
      store.set(accuracyHistoryAtom, [30, 35, 28, 32]);

      const first = makeLocation(35.0, 139.0, 30, 1000);
      setLocation(first);

      const second = makeLocation(35.001, 139.001, 30, 4000);
      setLocation(second);

      const result = store.get(locationAtom);
      // EMAが適用されるため、生の座標とは異なる値になるはず
      expect(result?.coords.latitude).not.toBe(35.001);
      expect(result?.coords.longitude).not.toBe(139.001);
    });

    it('サンプル数が不足している場合はスムージングをスキップする', () => {
      setStationLineType(LineType.Subway);
      // 2サンプルのみ（新しい値を追加しても3で MIN_STABILITY_SAMPLES=4 未満）
      store.set(accuracyHistoryAtom, [30, 35]);

      const loc = makeLocation(35.0, 139.0, 30, 1000);
      setLocation(loc);

      const result = store.get(locationAtom);
      expect(result?.coords.latitude).toBe(35.0);
      expect(result?.coords.longitude).toBe(139.0);
    });

    it('精度が安定していても平均が200m以上の場合はスムージングをスキップする', () => {
      setStationLineType(LineType.Subway);
      // 安定だが高い値（平均250m）
      store.set(accuracyHistoryAtom, [240, 250, 260, 250]);

      const loc = makeLocation(35.0, 139.0, 250, 1000);
      setLocation(loc);

      const result = store.get(locationAtom);
      expect(result?.coords.latitude).toBe(35.0);
      expect(result?.coords.longitude).toBe(139.0);
    });

    // 回帰: スムージングをスキップする経路がワープ対策の速度フィルタごと素通しに
    // なっていたため、GPSが届かずWi-Fi/基地局測位へ落ちる地下鉄で、もっともらしい
    // 精度のまま届く遠方の座標がそのまま反映され無関係な駅へ飛んでいた。
    it('スムージングをスキップしてもありえない速度のワープは棄却する', () => {
      setStationLineType(LineType.Subway);
      store.set(accuracyHistoryAtom, [10, 300, 20, 400]);

      setLocation(makeLocation(35.0, 139.0, 500, 1_000));
      expect(store.get(locationAtom)?.coords.latitude).toBe(35.0);

      // 1秒後に約1km離れた別の駅付近の座標が届く(≒1000m/s)
      const warpLat = 35.0 + 1_000 / METERS_PER_DEG_LAT;
      setLocation(makeLocation(warpLat, 139.0, 500, 2_000));

      expect(store.get(locationAtom)?.coords.latitude).toBe(35.0);
    });

    it('妥当な速度の移動はスムージングせず生の座標のまま反映する', () => {
      setStationLineType(LineType.Subway);
      store.set(accuracyHistoryAtom, [10, 300, 20, 400]);

      setLocation(makeLocation(35.0, 139.0, 500, 1_000));

      // 1秒で約20m(=72km/h)進む
      const movedLat = 35.0 + 20 / METERS_PER_DEG_LAT;
      setLocation(makeLocation(movedLat, 139.0, 500, 2_000));

      expect(store.get(locationAtom)?.coords.latitude).toBe(movedLat);
    });

    // 測位が途切れた区間を跨いでも判定対象は平均速度なので、地下鉄の営業最高速度
    // (おおむね110km/h以下)を超えない限り受理する
    it('測位が途切れたあとの妥当な平均速度の移動は受理する', () => {
      setStationLineType(LineType.Subway);
      store.set(accuracyHistoryAtom, [10, 300, 20, 400]);

      setLocation(makeLocation(35.0, 139.0, 500, 1_000));

      // 60秒で1.5km(=90km/h)先の次駅付近へ進む
      const movedLat = 35.0 + 1_500 / METERS_PER_DEG_LAT;
      setLocation(makeLocation(movedLat, 139.0, 500, 61_000));

      expect(store.get(locationAtom)?.coords.latitude).toBe(movedLat);
    });

    // 隣駅程度の距離(500m〜1km)のワープは、既定の閾値(360km/h)だと数秒で通ってしまう。
    // 地下鉄ではその距離こそが典型的な誤測位なので路線種別に見合う閾値まで絞っている。
    it('隣駅程度の距離のワープも数秒では受理しない', () => {
      setStationLineType(LineType.Subway);
      store.set(accuracyHistoryAtom, [10, 300, 20, 400]);

      setLocation(makeLocation(35.0, 139.0, 500, 1_000));

      // 1秒間隔で500m先の駅付近の座標が届き続ける(既定の閾値なら5秒目で受理される)
      const warpLat = 35.0 + 500 / METERS_PER_DEG_LAT;
      for (let i = 1; i <= 10; i++) {
        setLocation(makeLocation(warpLat, 139.0, 500, 1_000 + i * 1_000));
      }

      expect(store.get(locationAtom)?.coords.latitude).toBe(35.0);
    });

    // 回帰: 基準の張り直しが回数だけの条件だと、配信の速いiOS(概ね1Hz)では
    // 5秒でワープを受け入れてしまい、10秒間隔のAndroidとの差が「iPhoneだけ
    // ワープしがち」として表面化する。
    it('高頻度配信では棄却が数秒続いた程度で基準を明け渡さない', () => {
      setStationLineType(LineType.Subway);
      store.set(accuracyHistoryAtom, [10, 300, 20, 400]);

      setLocation(makeLocation(35.0, 139.0, 500, 1_000));

      // 1秒間隔で同じ誤測位が届き続ける(MAX_CONSECUTIVE_SPEED_REJECTIONSは超える)。
      // 基準が古くなるほど見かけの速度は下がるため、棄却され続ける距離を選ぶ。
      const warpLat = 35.0 + 3_000 / METERS_PER_DEG_LAT;
      for (let i = 1; i <= 10; i++) {
        setLocation(makeLocation(warpLat, 139.0, 500, 1_000 + i * 1_000));
      }

      expect(store.get(locationAtom)?.coords.latitude).toBe(35.0);
    });

    it('棄却が規定時間続いたら基準を張り直して凍結から復帰する', () => {
      setStationLineType(LineType.Subway);
      store.set(accuracyHistoryAtom, [10, 300, 20, 400]);

      setLocation(makeLocation(35.0, 139.0, 500, 1_000));

      // 最初の棄却(t=2000)からMIN_SPEED_REJECTION_STREAK_MS(20秒)経過するまで送り続ける
      const warpLat = 35.0 + 3_000 / METERS_PER_DEG_LAT;
      for (let i = 1; i <= 21; i++) {
        setLocation(makeLocation(warpLat, 139.0, 500, 1_000 + i * 1_000));
      }

      expect(store.get(locationAtom)?.coords.latitude).toBe(warpLat);
    });

    // 地上→地下鉄の切り替わり直後は、スキップ経路の基準がまだ一度も更新されていない。
    // 本線経路の受理時に基準を揃えておかないと、この1点目だけ無防備になる。
    it('地上から地下鉄へ切り替わった直後の1点にもワープ対策が効く', () => {
      setStationLineType(LineType.Normal);
      setLocation(makeLocation(35.0, 139.0, 30, 1_000));

      setStationLineType(LineType.Subway);
      store.set(accuracyHistoryAtom, [10, 300, 20, 400]);

      const warpLat = 35.0 + 1_000 / METERS_PER_DEG_LAT;
      setLocation(makeLocation(warpLat, 139.0, 500, 2_000));

      expect(store.get(locationAtom)?.coords.latitude).toBe(35.0);
    });

    it('平均精度がちょうど200mの境界値の場合はスムージングをスキップする', () => {
      setStationLineType(LineType.Subway);
      // 平均がちょうど200m（mean >= BAD_ACCURACY_THRESHOLD で不安定扱い）
      store.set(accuracyHistoryAtom, [200, 200, 200, 200]);

      const loc = makeLocation(35.0, 139.0, 200, 1000);
      setLocation(loc);

      const result = store.get(locationAtom);
      expect(result?.coords.latitude).toBe(35.0);
      expect(result?.coords.longitude).toBe(139.0);
    });
  });
});

// 東北新幹線の一ノ関〜仙台に相当する南北方向の直線を走らせる。
// 緯度1度 ≒ 111,320m として、速度から1サンプルあたりの緯度差を求める。
const METERS_PER_DEG_LAT = 111_320;

const runConstantSpeed = ({
  speedKmh,
  accuracy,
  sampleIntervalMs,
  samples,
  startLat = 38.9,
  startTimestamp = 1_000,
}: {
  speedKmh: number;
  accuracy: number;
  sampleIntervalMs: number;
  samples: number;
  startLat?: number;
  startTimestamp?: number;
}) => {
  const degPerSample =
    ((speedKmh / 3.6) * (sampleIntervalMs / 1000)) / METERS_PER_DEG_LAT;

  let maxLagMeters = 0;
  let lastLagMeters = 0;
  for (let i = 0; i < samples; i++) {
    const trueLat = startLat - degPerSample * i;
    setLocation(
      makeLocation(
        trueLat,
        140.9,
        accuracy,
        startTimestamp + sampleIntervalMs * i
      )
    );
    const shownLat = store.get(locationAtom)?.coords.latitude ?? trueLat;
    lastLagMeters = Math.abs(shownLat - trueLat) * METERS_PER_DEG_LAT;
    maxLagMeters = Math.max(maxLagMeters, lastLagMeters);
  }
  return { maxLagMeters, lastLagMeters };
};

// 定速走行時にEMAが構造的に持つ追従遅れ ((1-α)/α)·v·dt。
// 速度フィルタが正常に受理し続けている限り、ズレはこの値付近で頭打ちになる。
// 逆にこれを大きく超える場合は棄却ループで位置が凍結していることを意味する。
const expectedEmaLagMeters = (
  speedKmh: number,
  alpha: number,
  sampleIntervalMs: number
) => ((1 - alpha) / alpha) * (speedKmh / 3.6) * (sampleIntervalMs / 1000);

describe('高速走行時の追従', () => {
  beforeEach(() => {
    resetLocationState();
    setStationLineType(LineType.Normal);
  });

  // 回帰: 速度フィルタの基準にEMA後の座標を使うと、EMAの追従遅れが変位へ上乗せされ
  // 算出速度が実速度の1/α倍に膨らむ。実効しきい値がα×360km/hまで下がり、
  // 新幹線の320km/h走行が丸ごと棄却されて位置が数十km手前で凍結していた。
  it.each([
    // alphaはgetSmoothingAlphaの区分に対応する
    { accuracy: 30, alpha: 0.8, label: '精度良好' },
    { accuracy: 100, alpha: 0.6, label: '精度中' },
    { accuracy: 300, alpha: 0.3, label: '精度不良' },
  ])(
    '320km/hで5分走り続けても位置が凍結しない（$label）',
    ({ accuracy, alpha }) => {
      const speedKmh = 320;
      const sampleIntervalMs = 1000;
      const { maxLagMeters, lastLagMeters } = runConstantSpeed({
        speedKmh,
        accuracy,
        sampleIntervalMs,
        samples: 300,
      });

      // 修正前はこの条件で98%以上の測位が棄却され、5分間で10km以上ズレていた。
      // ズレがEMA固有の追従遅れの範囲に収まっていれば受理し続けられている。
      const emaLag = expectedEmaLagMeters(speedKmh, alpha, sampleIntervalMs);
      expect(maxLagMeters).toBeLessThan(emaLag * 1.1);
      // 時間が経ってもズレが増えない（凍結して開き続けない）こと
      expect(lastLagMeters).toBeLessThan(emaLag * 1.1);
    }
  );

  // 回帰: αを配信間隔で正規化していないと、追従遅れ ((1-α)/α)·v·Δt が Δt に比例する。
  // #6395でAndroidの更新間隔が5秒→10秒になった際、遅れがそのまま倍増して到着判定が
  // 駅の直前までずれ込んだ(#6916)。精度が良い帯では間隔が変わっても遅れが変わらないこと。
  it.each([
    { accuracy: 30, label: '精度良好' },
    { accuracy: 100, label: '精度中' },
  ])('追従遅れが配信間隔に依存しない（$label）', ({ accuracy }) => {
    const speedKmh = 95;
    const run = (sampleIntervalMs: number) => {
      resetLocationState();
      setStationLineType(LineType.Normal);
      return runConstantSpeed({
        speedKmh,
        accuracy,
        sampleIntervalMs,
        samples: Math.ceil(300_000 / sampleIntervalMs),
      }).lastLagMeters;
    };

    const at1s = run(1000);
    const at5s = run(5000);
    const at10s = run(10000);

    // 1秒間隔では旧実装のαと一致するため、そこを基準に間隔を延ばしても増えないこと
    expect(at5s).toBeLessThan(at1s + 20);
    expect(at10s).toBeLessThan(at1s + 20);
  });

  // 精度がBAD_ACCURACY_THRESHOLDを超える帯は、測位ノイズが到着圏に対して大きく
  // スムージングが判定の安定性を担うため、意図的に正規化から外して固定αを保つ。
  it('精度不良帯は固定αのまま（正規化の対象外）', () => {
    const speedKmh = 95;
    const lagAt = (sampleIntervalMs: number) => {
      resetLocationState();
      setStationLineType(LineType.Normal);
      return runConstantSpeed({
        speedKmh,
        accuracy: 300,
        sampleIntervalMs,
        samples: Math.ceil(300_000 / sampleIntervalMs),
      }).lastLagMeters;
    };

    // 固定α=0.3のまま。遅れは ((1-α)/α)·v·Δt で間隔に比例して増える
    expect(lagAt(10000)).toBeGreaterThan(lagAt(1000) * 5);
    expect(lagAt(1000)).toBeCloseTo(
      expectedEmaLagMeters(speedKmh, 0.3, 1000),
      0
    );
  });

  it('130km/hの在来線速度でも追従する', () => {
    const { maxLagMeters } = runConstantSpeed({
      speedKmh: 130,
      accuracy: 100,
      sampleIntervalMs: 1000,
      samples: 300,
    });

    // 到着判定圏(ARRIVED_MAX_THRESHOLD=200m)に十分収まること
    expect(maxLagMeters).toBeLessThan(50);
  });

  // 回帰: 測位が長時間途切れたあとEMAで混ぜると新しい測位のα割しか反映されず、
  // 残った遅れが次の変位へ乗って再棄却され、復帰できなくなっていた。
  it('測位が30分途切れたあと最初の測位で現在地へ復帰する', () => {
    setLocation(makeLocation(38.9, 140.9, 30, 1_000));

    // 30分後、約160km南下した地点で測位が再開する
    const resumedLat = 38.9 - 160_000 / METERS_PER_DEG_LAT;
    setLocation(makeLocation(resumedLat, 140.9, 100, 1_000 + 30 * 60 * 1000));

    // スムージングを挟まず生の座標へスナップすること
    expect(store.get(locationAtom)?.coords.latitude).toBeCloseTo(resumedLat, 6);
  });

  // 回帰: STALE_REFERENCE_MS は「これ以上古い」基準なので、境界値ちょうどでも
  // スナップする（比較が > だと境界でEMAが掛かり生座標へ張り付かない）
  it('途切れがSTALE_REFERENCE_MSちょうど(30秒)でも生座標へスナップする', () => {
    setLocation(makeLocation(38.9, 140.9, 30, 1_000));

    // ちょうど30秒後、速度としては妥当な範囲(約1.6km先 ≒ 53m/s)で測位が再開する
    const resumedLat = 38.9 - 1_600 / METERS_PER_DEG_LAT;
    setLocation(makeLocation(resumedLat, 140.9, 100, 1_000 + 30_000));

    expect(store.get(locationAtom)?.coords.latitude).toBeCloseTo(resumedLat, 9);
  });

  it('連続棄却が上限に達したら基準を張り直して凍結から復帰する', () => {
    setLocation(makeLocation(38.9, 140.9, 30, 1_000));

    // Androidの配信間隔(10秒)で物理的にありえない距離のジャンプを送り続ける
    const jumpLat = 36.0;
    for (let i = 1; i <= 5; i++) {
      setLocation(makeLocation(jumpLat, 140.9, 30, 1_000 + i * 10_000));
    }

    // 回数(5回)と経過時間(20秒)の双方を満たした時点で基準を張り直す
    expect(store.get(locationAtom)?.coords.latitude).toBe(jumpLat);
  });

  // 回帰: 張り直しの条件が回数だけだと、ワープ対策の粘り強さが配信間隔に反比例する。
  // iOSは概ね1Hz配信なので5回=5秒で基準を明け渡し、10秒間隔のAndroidより
  // 桁違いにワープしやすくなっていた。
  it('基準を張り直すまでの粘り強さが配信間隔に依存しない', () => {
    setLocation(makeLocation(38.9, 140.9, 30, 1_000));

    const jumpLat = 36.0;
    // iOS相当の1秒間隔。最初の棄却はt=2000なので、20秒経過するのはt=22000。
    for (let i = 1; i <= 20; i++) {
      setLocation(makeLocation(jumpLat, 140.9, 30, 1_000 + i * 1_000));
    }
    expect(store.get(locationAtom)?.coords.latitude).toBe(38.9);

    setLocation(makeLocation(jumpLat, 140.9, 30, 1_000 + 21 * 1_000));
    expect(store.get(locationAtom)?.coords.latitude).toBe(jumpLat);
  });

  // 回帰: 「基準が古い」判定が速度フィルタより先に return していると、
  // 測位間隔が空いた直後の1点に限ってワープ対策が無効になる
  it('30秒以上途切れたあとでも物理的にありえないジャンプは棄却する', () => {
    setLocation(makeLocation(38.9, 140.9, 30, 1_000));

    // 60秒後に約500km離れた地点（≒8300m/s）へ飛ぶ測位が届く
    const warpLat = 38.9 - 500_000 / METERS_PER_DEG_LAT;
    setLocation(makeLocation(warpLat, 140.9, 30, 1_000 + 60_000));

    expect(store.get(locationAtom)?.coords.latitude).toBe(38.9);
  });

  it('単発のジャンプは従来どおり棄却する', () => {
    setLocation(makeLocation(38.9, 140.9, 30, 1_000));
    setLocation(makeLocation(36.0, 140.9, 30, 2_000));

    expect(store.get(locationAtom)?.coords.latitude).toBe(38.9);
  });
});
