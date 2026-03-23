import { renderHook } from '@testing-library/react-native';
import { createStation } from '~/utils/test/factories';
import { usePresetStops } from './usePresetStops';

// 北千住(1)→南千住(2)→三ノ輪(3)→入谷(4)→上野(5) の順で並ぶ想定
const kitaSenju = createStation(1, {
  name: '北千住',
  latitude: 35.7497,
  longitude: 139.8049,
});
const minamiSenju = createStation(2, {
  name: '南千住',
  latitude: 35.7357,
  longitude: 139.8009,
});
const minowa = createStation(3, {
  name: '三ノ輪',
  latitude: 35.7289,
  longitude: 139.7907,
});
const iriya = createStation(4, {
  name: '入谷',
  latitude: 35.7208,
  longitude: 139.7836,
});
const ueno = createStation(5, {
  name: '上野',
  latitude: 35.7141,
  longitude: 139.7774,
});

const stations = [kitaSenju, minamiSenju, minowa, iriya, ueno];

describe('usePresetStops', () => {
  describe('presetOrigin', () => {
    it('savedRouteDirection が null の場合 null を返す', () => {
      const { result } = renderHook(() =>
        usePresetStops({
          savedRouteDirection: null,
          stations,
          wantedDestination: null,
          confirmedStation: null,
        })
      );
      expect(result.current.presetOrigin).toBeNull();
    });

    it('INBOUND の場合 stations[0] を返す', () => {
      const { result } = renderHook(() =>
        usePresetStops({
          savedRouteDirection: 'INBOUND',
          stations,
          wantedDestination: null,
          confirmedStation: null,
        })
      );
      expect(result.current.presetOrigin?.groupId).toBe(kitaSenju.groupId);
    });

    it('OUTBOUND の場合 stations の末尾を返す', () => {
      const { result } = renderHook(() =>
        usePresetStops({
          savedRouteDirection: 'OUTBOUND',
          stations,
          wantedDestination: null,
          confirmedStation: null,
        })
      );
      expect(result.current.presetOrigin?.groupId).toBe(ueno.groupId);
    });
  });

  describe('presetStops', () => {
    it('presetOrigin が null の場合 undefined を返す', () => {
      const { result } = renderHook(() =>
        usePresetStops({
          savedRouteDirection: null,
          stations,
          wantedDestination: minowa,
          confirmedStation: null,
        })
      );
      expect(result.current.presetStops).toBeUndefined();
    });

    it('wantedDestination が null の場合 undefined を返す', () => {
      const { result } = renderHook(() =>
        usePresetStops({
          savedRouteDirection: 'INBOUND',
          stations,
          wantedDestination: null,
          confirmedStation: null,
        })
      );
      expect(result.current.presetStops).toBeUndefined();
    });

    it('INBOUND で origin(北千住) から destination(三ノ輪) までのスライスを返す', () => {
      const { result } = renderHook(() =>
        usePresetStops({
          savedRouteDirection: 'INBOUND',
          stations,
          wantedDestination: minowa,
          confirmedStation: null,
        })
      );
      expect(result.current.presetStops?.map((s) => s.groupId)).toEqual([
        1, 2, 3,
      ]);
    });

    it('OUTBOUND で origin(上野) から destination(三ノ輪) までのスライスを返す', () => {
      const { result } = renderHook(() =>
        usePresetStops({
          savedRouteDirection: 'OUTBOUND',
          stations,
          wantedDestination: minowa,
          confirmedStation: null,
        })
      );
      expect(result.current.presetStops?.map((s) => s.groupId)).toEqual([
        3, 4, 5,
      ]);
    });
  });

  describe('nearestPresetStation', () => {
    it('presetStops が undefined の場合 undefined を返す', () => {
      const { result } = renderHook(() =>
        usePresetStops({
          savedRouteDirection: null,
          stations,
          wantedDestination: null,
          confirmedStation: null,
        })
      );
      expect(result.current.nearestPresetStation).toBeUndefined();
    });

    it('presetStops が 2 駅以下の場合 undefined を返す', () => {
      const twoStations = [kitaSenju, minowa];
      const { result } = renderHook(() =>
        usePresetStops({
          savedRouteDirection: 'INBOUND',
          stations: twoStations,
          wantedDestination: minowa,
          confirmedStation: null,
        })
      );
      expect(result.current.nearestPresetStation).toBeUndefined();
    });

    it('confirmedStation が中間駅にある場合そのまま返す', () => {
      const { result } = renderHook(() =>
        usePresetStops({
          savedRouteDirection: 'INBOUND',
          stations,
          wantedDestination: minowa,
          confirmedStation: minamiSenju,
        })
      );
      expect(result.current.nearestPresetStation?.groupId).toBe(
        minamiSenju.groupId
      );
    });

    it('confirmedStation が端点の場合は中間駅から座標最寄りを返す', () => {
      const { result } = renderHook(() =>
        usePresetStops({
          savedRouteDirection: 'INBOUND',
          stations,
          wantedDestination: minowa,
          confirmedStation: kitaSenju,
        })
      );
      // 北千住は端点なので除外、中間駅は南千住のみ
      expect(result.current.nearestPresetStation?.groupId).toBe(
        minamiSenju.groupId
      );
    });

    it('confirmedStation が範囲外の場合は座標最寄りの中間駅を返す', () => {
      // 有楽町相当: 北千住〜三ノ輪 の範囲外だが座標は南千住に近い
      const yurakucho = createStation(99, {
        name: '有楽町',
        latitude: 35.7345,
        longitude: 139.8,
      });
      const { result } = renderHook(() =>
        usePresetStops({
          savedRouteDirection: 'INBOUND',
          stations,
          wantedDestination: minowa,
          confirmedStation: yurakucho,
        })
      );
      expect(result.current.nearestPresetStation?.groupId).toBe(
        minamiSenju.groupId
      );
    });
  });

  describe('resolvePresetDirection', () => {
    it('selectedStation が末尾の場合 INBOUND を返す', () => {
      const { result } = renderHook(() =>
        usePresetStops({
          savedRouteDirection: 'INBOUND',
          stations,
          wantedDestination: minowa,
          confirmedStation: null,
        })
      );
      const stops = [kitaSenju, minamiSenju, minowa];
      expect(result.current.resolvePresetDirection(minowa, stops)).toBe(
        'INBOUND'
      );
    });

    it('selectedStation が末尾でない場合 OUTBOUND を返す', () => {
      const { result } = renderHook(() =>
        usePresetStops({
          savedRouteDirection: 'INBOUND',
          stations,
          wantedDestination: minowa,
          confirmedStation: null,
        })
      );
      const stops = [kitaSenju, minamiSenju, minowa];
      expect(result.current.resolvePresetDirection(kitaSenju, stops)).toBe(
        'OUTBOUND'
      );
    });
  });
});
