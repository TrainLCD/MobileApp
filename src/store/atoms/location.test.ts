import type * as Location from 'expo-location';
import { LineType, type Station } from '~/@types/graphql';
import { store } from '..';
import {
  accuracyHistoryAtom,
  locationAtom,
  resetLocationState,
  setLocation,
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
});
