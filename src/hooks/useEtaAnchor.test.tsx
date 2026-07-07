import { act, renderHook } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import type React from 'react';
import type { Station } from '~/@types/graphql';
import { createStation } from '~/utils/test/factories';
import {
  etaAnchorAtom,
  etaFallbackActiveAtom,
} from '../store/atoms/etaFallback';
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
    etaFallbackActive = false,
  } = {}
) => {
  store.set(arrivedAtom, arrived);
  store.set(stationAtom, station);
  store.set(selectedBoundAtom, selectedBound);
  store.set(etaFallbackActiveAtom, etaFallbackActive);

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

  it('arrived が true→false に遷移すると DEPARTED が一発記録され、その後falseのままでは上書きされない', () => {
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

  it('etaFallbackActiveAtom が true の間は記録されない', () => {
    jest.spyOn(Date, 'now').mockReturnValue(3_000_000);
    const store = createStore();

    renderWithStore(store, {
      arrived: true,
      station: stationA,
      etaFallbackActive: true,
    });

    expect(store.get(etaAnchorAtom)).toBeNull();

    jest.spyOn(Date, 'now').mockReturnValue(3_005_000);
    act(() => {
      jest.advanceTimersByTime(AT_STATION_REFRESH_INTERVAL_MS);
    });

    expect(store.get(etaAnchorAtom)).toBeNull();

    // 発車遷移が起きても、フォールバック活性中は記録しない
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
