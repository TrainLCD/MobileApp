import { act, renderHook } from '@testing-library/react-native';
import type * as Location from 'expo-location';
import { createStore, Provider } from 'jotai';
import type React from 'react';
import type { Station } from '~/@types/graphql';
import { StopCondition } from '~/@types/graphql';
import { createStation } from '~/utils/test/factories';
import { etaAnchorAtom } from '../store/atoms/etaFallback';
import {
  locationAccuracyOutlierAtom,
  locationAtom,
} from '../store/atoms/location';
import {
  arrivedAtom,
  selectedBoundAtom,
  stationAtom,
} from '../store/atoms/station';
import { useEtaAnchor } from './useEtaAnchor';

// AT_STATION の定期更新周期(フック内部定数と同じ5秒)。
const AT_STATION_REFRESH_INTERVAL_MS = 5_000;

const stationA = createStation(1);
const passStation = createStation(2, { stopCondition: StopCondition.Not });
const boundStation = createStation(99);

const renderWithStore = (
  store: ReturnType<typeof createStore>,
  {
    arrived = true,
    station = stationA as Station | null,
    selectedBound = boundStation as Station | null,
  } = {}
) => {
  store.set(arrivedAtom, arrived);
  store.set(stationAtom, station);
  store.set(selectedBoundAtom, selectedBound);

  const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Provider store={store}>{children}</Provider>
  );
  return renderHook(() => useEtaAnchor(), { wrapper });
};

describe('useEtaAnchor', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('到着中は AT_STATION が記録され、時間経過で observedAtMs が更新される', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
    const store = createStore();

    renderWithStore(store, { arrived: true, station: stationA });

    expect(store.get(etaAnchorAtom)).toEqual({
      stationId: stationA.id,
      kind: 'AT_STATION',
      observedAtMs: 1_000_000,
    });

    // 5秒経過。arrived/stationは不変だが、useIntervalの定期更新でobservedAtMsが進む
    jest.spyOn(Date, 'now').mockReturnValue(1_005_000);
    act(() => {
      jest.advanceTimersByTime(AT_STATION_REFRESH_INTERVAL_MS);
    });

    expect(store.get(etaAnchorAtom)).toEqual({
      stationId: stationA.id,
      kind: 'AT_STATION',
      observedAtMs: 1_005_000,
    });
  });

  it('arrived true→false 遷移で DEPARTED が一発記録され、その後falseのままでは上書きされない', () => {
    jest.spyOn(Date, 'now').mockReturnValue(2_000_000);
    const store = createStore();

    renderWithStore(store, { arrived: true, station: stationA });
    expect(store.get(etaAnchorAtom)?.kind).toBe('AT_STATION');

    jest.spyOn(Date, 'now').mockReturnValue(2_001_000);
    act(() => {
      store.set(arrivedAtom, false);
    });

    expect(store.get(etaAnchorAtom)).toEqual({
      stationId: stationA.id,
      kind: 'DEPARTED',
      observedAtMs: 2_001_000,
    });

    // 発車後、時間が経過してもDEPARTEDのobservedAtMsは上書きされない
    jest.spyOn(Date, 'now').mockReturnValue(2_010_000);
    act(() => {
      jest.advanceTimersByTime(AT_STATION_REFRESH_INTERVAL_MS * 2);
    });

    expect(store.get(etaAnchorAtom)).toEqual({
      stationId: stationA.id,
      kind: 'DEPARTED',
      observedAtMs: 2_001_000,
    });
  });

  // 回帰: 地下鉄の駅で精度が落ちると useRefreshStation が現在位置を信用できないと判断して
  // arrived を false へ倒すため、停車したままでも「発車」として記録されていた。そこから
  // ETA仮想時計が走り出し、以降の推定が「もう発車したはず」の側へずれる。
  it('精度の外れ値でarrivedがfalseになった場合はDEPARTEDを記録しない', () => {
    jest.spyOn(Date, 'now').mockReturnValue(3_000_000);
    const store = createStore();

    renderWithStore(store, { arrived: true, station: stationA });
    expect(store.get(etaAnchorAtom)?.kind).toBe('AT_STATION');

    jest.spyOn(Date, 'now').mockReturnValue(3_001_000);
    act(() => {
      // 継続測位が最大許容精度超で棄却された状態
      store.set(locationAccuracyOutlierAtom, true);
      store.set(arrivedAtom, false);
    });

    // 発車していないのでアンカーは直前のAT_STATIONのまま
    expect(store.get(etaAnchorAtom)).toEqual({
      stationId: stationA.id,
      kind: 'AT_STATION',
      observedAtMs: 3_000_000,
    });
  });

  it('最大許容精度を超える測位を保持している場合もDEPARTEDを記録しない', () => {
    jest.spyOn(Date, 'now').mockReturnValue(4_000_000);
    const store = createStore();

    renderWithStore(store, { arrived: true, station: stationA });

    jest.spyOn(Date, 'now').mockReturnValue(4_001_000);
    act(() => {
      // ワンショット取得・手動選択で粗い精度の測位がlocationAtomへ入った状態
      store.set(locationAtom, {
        coords: {
          latitude: 35,
          longitude: 139,
          accuracy: 5_000,
          altitude: 0,
          altitudeAccuracy: 0,
          heading: 0,
          speed: 0,
        },
        timestamp: 4_001_000,
      } as Location.LocationObject);
      store.set(arrivedAtom, false);
    });

    expect(store.get(etaAnchorAtom)?.kind).toBe('AT_STATION');
  });

  it('測位が信用できる状態での発車は従来どおりDEPARTEDを記録する', () => {
    jest.spyOn(Date, 'now').mockReturnValue(5_000_000);
    const store = createStore();

    renderWithStore(store, { arrived: true, station: stationA });

    jest.spyOn(Date, 'now').mockReturnValue(5_001_000);
    act(() => {
      store.set(locationAtom, {
        coords: {
          latitude: 35,
          longitude: 139,
          accuracy: 30,
          altitude: 0,
          altitudeAccuracy: 0,
          heading: 0,
          speed: 0,
        },
        timestamp: 5_001_000,
      } as Location.LocationObject);
      store.set(arrivedAtom, false);
    });

    expect(store.get(etaAnchorAtom)).toEqual({
      stationId: stationA.id,
      kind: 'DEPARTED',
      observedAtMs: 5_001_000,
    });
  });

  it('通過駅への到着ではアンカーが記録されない', () => {
    jest.spyOn(Date, 'now').mockReturnValue(3_000_000);
    const store = createStore();

    renderWithStore(store, { arrived: true, station: passStation });

    expect(store.get(etaAnchorAtom)).toBeNull();

    // 定期更新でも記録されないままであることを確認する
    act(() => {
      jest.advanceTimersByTime(AT_STATION_REFRESH_INTERVAL_MS);
    });
    expect(store.get(etaAnchorAtom)).toBeNull();
  });

  it('通過駅からの発車では DEPARTED が記録されない', () => {
    jest.spyOn(Date, 'now').mockReturnValue(3_100_000);
    const store = createStore();

    renderWithStore(store, { arrived: true, station: passStation });
    expect(store.get(etaAnchorAtom)).toBeNull();

    act(() => {
      store.set(arrivedAtom, false);
    });

    expect(store.get(etaAnchorAtom)).toBeNull();
  });

  it('selectedBound が null になると anchor が null にクリアされる', () => {
    jest.spyOn(Date, 'now').mockReturnValue(4_000_000);
    const store = createStore();

    renderWithStore(store, { arrived: true, station: stationA });
    expect(store.get(etaAnchorAtom)).not.toBeNull();

    act(() => {
      store.set(selectedBoundAtom, null);
    });

    expect(store.get(etaAnchorAtom)).toBeNull();
  });
});
