import type * as Location from 'expo-location';
import { LineType, type Station } from '~/@types/graphql';
import { store } from '..';
import {
  accuracyHistoryAtom,
  lastAcceptedFixAtMsAtom,
  lastMovingAtMsAtom,
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

  describe('lastAcceptedFixAtMsAtom（ETAフォールバックのstaleness判定用）', () => {
    it('通常のsetLocation受理でlastAcceptedFixAtMsが更新される', () => {
      const before = Date.now();
      setLocation(makeLocation(35.0, 139.0, 30, 1000));
      const after = Date.now();

      const recordedAt = store.get(lastAcceptedFixAtMsAtom);
      expect(recordedAt).not.toBeNull();
      expect(recordedAt as number).toBeGreaterThanOrEqual(before);
      expect(recordedAt as number).toBeLessThanOrEqual(after);
    });

    it('地下鉄でスムージングスキップされた受理パスでもlastAcceptedFixAtMsが更新される', () => {
      setStationLineType(LineType.Subway);
      // 高い変動の精度履歴をセット（スムージングスキップ条件を満たす）
      store.set(accuracyHistoryAtom, [10, 300, 20, 400]);

      const before = Date.now();
      setLocation(makeLocation(35.0, 139.0, 500, 1000));
      const after = Date.now();

      const recordedAt = store.get(lastAcceptedFixAtMsAtom);
      expect(recordedAt).not.toBeNull();
      expect(recordedAt as number).toBeGreaterThanOrEqual(before);
      expect(recordedAt as number).toBeLessThanOrEqual(after);
    });

    it('speedフィルタでワープ棄却される場合はlastAcceptedFixAtMsが更新されない', () => {
      // フィルタ基準となる前回値を用意する
      setLocation(makeLocation(35.0, 139.0, 30, 1000));
      const recordedAfterFirst = store.get(lastAcceptedFixAtMsAtom);

      // 1秒で遠方へジャンプ → MAX_PLAUSIBLE_SPEED超過で座標は棄却される
      setLocation(makeLocation(36.0, 140.0, 30, 2000));

      expect(store.get(lastAcceptedFixAtMsAtom)).toBe(recordedAfterFirst);
    });

    it('store.set(locationAtom, …)の直書きではlastAcceptedFixAtMsは更新されない', () => {
      expect(store.get(lastAcceptedFixAtMsAtom)).toBeNull();

      store.set(locationAtom, makeLocation(35.0, 139.0, 30, 1000));

      expect(store.get(locationAtom)).not.toBeNull();
      expect(store.get(lastAcceptedFixAtMsAtom)).toBeNull();
    });

    it('resetLocationStateでnullに戻る', () => {
      setLocation(makeLocation(35.0, 139.0, 30, 1000));
      expect(store.get(lastAcceptedFixAtMsAtom)).not.toBeNull();

      resetLocationState();

      expect(store.get(lastAcceptedFixAtMsAtom)).toBeNull();
    });
  });

  describe('lastMovingAtMsAtom（実移動の検知）', () => {
    // recordMotion は dt を Date.now() 差で測るため、決定的にするため now を固定する。
    let currentNow = 1_000_000;

    beforeEach(() => {
      currentNow = 1_000_000;
      jest.spyOn(Date, 'now').mockImplementation(() => currentNow);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('初回の受理測位では基準サンプルを初期化するだけで lastMovingAtMs は立たない', () => {
      setLocation(makeLocation(35.0, 139.0, 30, 1000));
      expect(store.get(lastMovingAtMsAtom)).toBeNull();
    });

    it('閾値(150m)を超える正味変位で lastMovingAtMs が更新される', () => {
      setLocation(makeLocation(35.0, 139.0, 30, 1000)); // 基準サンプル
      currentNow = 1_030_000; // 30秒後
      // 緯度 +0.003 度 ≒ 333m の北進。速度 333/30 ≒ 11 m/s で現実的。
      setLocation(makeLocation(35.003, 139.0, 30, 31000));

      expect(store.get(lastMovingAtMsAtom)).toBe(1_030_000);
    });

    it('閾値以下の微小変位(静止ジッタ)では lastMovingAtMs は更新されない', () => {
      setLocation(makeLocation(35.0, 139.0, 30, 1000));
      currentNow = 1_030_000;
      // 緯度 +0.0005 度 ≒ 55m。閾値 max(150, 精度30)=150 未満なので実移動とみなさない。
      setLocation(makeLocation(35.0005, 139.0, 30, 31000));

      expect(store.get(lastMovingAtMsAtom)).toBeNull();
    });

    it('測位精度が粗い場合は閾値が精度まで引き上げられ、精度内の変位は無視する', () => {
      setLocation(makeLocation(35.0, 139.0, 400, 1000));
      currentNow = 1_030_000;
      // 約333mの変位だが精度400mなので閾値 max(150,400)=400 を超えず未更新。
      setLocation(makeLocation(35.003, 139.0, 400, 31000));

      expect(store.get(lastMovingAtMsAtom)).toBeNull();
    });

    it('スムージングスキップ経路(地下鉄・不安定)でも閾値超の正味変位を検知する', () => {
      setStationLineType(LineType.Subway);
      store.set(accuracyHistoryAtom, [10, 300, 20, 400]); // 不安定=スキップ
      setLocation(makeLocation(35.0, 139.0, 100, 1000));
      currentNow = 1_030_000;
      setLocation(makeLocation(35.003, 139.0, 100, 31000)); // 約333m / 30秒

      expect(store.get(lastMovingAtMsAtom)).toBe(1_030_000);
    });

    it('スムージングスキップ経路でも非現実的速度のワープは実移動とみなさない', () => {
      setStationLineType(LineType.Subway);
      store.set(accuracyHistoryAtom, [10, 300, 20, 400]);
      setLocation(makeLocation(35.0, 139.0, 500, 1000));
      currentNow = 1_000_100; // わずか0.1秒後
      // 緯度 +0.01 度 ≒ 1113m を0.1秒 = 11130 m/s。MAX_PLAUSIBLE_SPEED超で除外。
      setLocation(makeLocation(35.01, 139.0, 500, 1100));

      expect(store.get(lastMovingAtMsAtom)).toBeNull();
    });

    it('resetLocationStateで lastMovingAtMs が null に戻る', () => {
      store.set(lastMovingAtMsAtom, 12_345);
      resetLocationState();
      expect(store.get(lastMovingAtMsAtom)).toBeNull();
    });
  });
});
