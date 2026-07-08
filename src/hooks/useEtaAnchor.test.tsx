import { act, renderHook } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import type React from 'react';
import type { Station } from '~/@types/graphql';
import { store as globalStore } from '~/store';
import { MOVING_RECENCY_MS } from '~/utils/etaFallback';
import { createStation } from '~/utils/test/factories';
import { etaAnchorAtom } from '../store/atoms/etaFallback';
import { lastMovingAtMsAtom } from '../store/atoms/location';
import {
  arrivedAtom,
  selectedBoundAtom,
  stationAtom,
} from '../store/atoms/station';
import { useEtaAnchor } from './useEtaAnchor';

// AT_STATION の定期更新周期(フック内部定数と同じ5秒)。
const AT_STATION_REFRESH_INTERVAL_MS = 5_000;

const stationA = createStation(1);
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
    // useEtaAnchor は lastMovingAtMs をシングルトンストアから読むためリセットする。
    globalStore.set(lastMovingAtMsAtom, null);
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

  it('直近に実移動があれば arrived true→false で DEPARTED が一発記録され、その後falseのままでは上書きされない', () => {
    jest.spyOn(Date, 'now').mockReturnValue(2_000_000);
    // 直近に実移動を観測済み(=電車が動いていた)。これがないと発車とみなさない。
    globalStore.set(lastMovingAtMsAtom, 2_000_000);
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

  it('実移動が無い(静止中に精度悪化で arrived が false)場合は DEPARTED を記録しない', () => {
    jest.spyOn(Date, 'now').mockReturnValue(5_000_000);
    // lastMovingAtMs は未設定(null)=直近に実移動なし。駅で待機中に強制未到着で
    // arrived が false に倒れただけの状況を模す。
    globalStore.set(lastMovingAtMsAtom, null);
    const store = createStore();

    renderWithStore(store, { arrived: true, station: stationA });
    expect(store.get(etaAnchorAtom)?.kind).toBe('AT_STATION');

    jest.spyOn(Date, 'now').mockReturnValue(5_001_000);
    act(() => {
      store.set(arrivedAtom, false);
    });

    // 偽発車は記録されず、直前の AT_STATION アンカーが保持される。
    expect(store.get(etaAnchorAtom)).toEqual({
      stationId: stationA.id,
      kind: 'AT_STATION',
      observedAtMs: 5_000_000,
    });
  });

  it('実移動はあったが MOVING_RECENCY_MS を超えて古い場合は DEPARTED を記録しない', () => {
    jest.spyOn(Date, 'now').mockReturnValue(6_000_000);
    // 実移動の観測はあるが有効期間(90秒)より前=期限切れ。発車判定の時間しきい値を跨いだ
    // 直後に強制未到着で false へ倒れても、偽発車として記録しないことを検証する。
    globalStore.set(lastMovingAtMsAtom, 6_000_000 - MOVING_RECENCY_MS - 1_000);
    const store = createStore();

    renderWithStore(store, { arrived: true, station: stationA });
    expect(store.get(etaAnchorAtom)?.kind).toBe('AT_STATION');

    jest.spyOn(Date, 'now').mockReturnValue(6_001_000);
    act(() => {
      store.set(arrivedAtom, false);
    });

    expect(store.get(etaAnchorAtom)).toEqual({
      stationId: stationA.id,
      kind: 'AT_STATION',
      observedAtMs: 6_000_000,
    });
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
