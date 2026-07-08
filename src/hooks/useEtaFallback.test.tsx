import { act, renderHook } from '@testing-library/react-native';
import { Provider } from 'jotai';
import type { ReactNode } from 'react';
import * as remoteConfigModule from '~/lib/remoteConfig';
import { store } from '~/store';
import { etaAnchorAtom, etaPhaseAtom } from '~/store/atoms/etaFallback';
import { locationAtom } from '~/store/atoms/location';
import {
  approachingAtom,
  arrivedAtom,
  selectedBoundAtom,
  stationAtom,
  stationsAtom,
} from '~/store/atoms/station';
import { createStation } from '~/utils/test/factories';
import { useEstimateArrivalTimesRoute } from './useEstimateArrivalTimesRoute';
import { useEtaFallback } from './useEtaFallback';

// GraphQL/env に依存する実装を読み込まないようフックごとモックする
jest.mock('./useEstimateArrivalTimesRoute', () => ({
  useEstimateArrivalTimesRoute: jest.fn(),
}));

const mockUseEstimateArrivalTimesRoute =
  useEstimateArrivalTimesRoute as jest.MockedFunction<
    typeof useEstimateArrivalTimesRoute
  >;

const wrapper = ({ children }: { children: ReactNode }) => (
  <Provider store={store}>{children}</Provider>
);

const routeStop = (
  stationId: number,
  cumulativeMinutes: number,
  departureCumulativeMinutes: number,
  stopsHere = true
) => ({
  stationId,
  stationGroupId: stationId,
  cumulativeMinutes,
  departureCumulativeMinutes,
  stopsHere,
});

// A(id1) 発 → B(id2, 到着2分/発車2.5分) → C(id3, 到着4分/発車4.5分)
const STOPS = [
  routeStop(1, 0, 0.5),
  routeStop(2, 2, 2.5),
  routeStop(3, 4, 4.5),
];
const STATIONS = [createStation(1), createStation(2), createStation(3)];

const T0 = 1_000_000;
let now = T0;

const setNow = (value: number) => {
  now = value;
};

const runTick = () => {
  act(() => {
    jest.advanceTimersByTime(1000);
  });
};

const mockRoute = (route: unknown) => {
  mockUseEstimateArrivalTimesRoute.mockReturnValue({
    route: route as never,
    loading: false,
    error: null,
  } as never);
};

// 現在駅・到着・接近・位置の初期値。R2撤去後は useEtaFallback がこれらを一切書き換えない
// ことを検証するための基準値として使う。
const BASE_LOCATION = {
  timestamp: T0,
  coords: {
    latitude: 35.0,
    longitude: 139.0,
    accuracy: 30,
    altitude: null,
    altitudeAccuracy: null,
    speed: null,
    heading: null,
  },
};

describe('useEtaFallback', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    now = T0;
    jest.spyOn(Date, 'now').mockImplementation(() => now);

    jest.spyOn(remoteConfigModule, 'isEtaAssistEnabled').mockReturnValue(true);
    jest
      .spyOn(remoteConfigModule, 'getEtaFallbackArrivalConfirmMarginSec')
      .mockReturnValue(30);

    mockRoute({ id: 1, stops: STOPS });

    store.set(stationsAtom, STATIONS);
    store.set(selectedBoundAtom, createStation(3));
    store.set(etaAnchorAtom, {
      stationId: 1,
      kind: 'DEPARTED',
      observedAtMs: T0,
    });
    store.set(etaPhaseAtom, null);
    store.set(arrivedAtom, false);
    store.set(approachingAtom, false);
    store.set(stationAtom, STATIONS[0]);
    store.set(locationAtom, BASE_LOCATION);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('有効・アンカーあり時に推定フェーズを etaPhaseAtom へ公開する', () => {
    renderHook(() => useEtaFallback(), { wrapper });

    // A発車から1秒: まだB到着(2分)には遠い → RUNNING(B)
    setNow(T0 + 1000);
    runTick();

    expect(store.get(etaPhaseAtom)).toEqual({
      kind: 'RUNNING',
      targetStationId: 2,
    });
  });

  it('経過に応じて DWELLING など後続フェーズも公開する', () => {
    renderHook(() => useEtaFallback(), { wrapper });

    // 仮想時計 m = 発車累積0.5 + 経過分。経過2.2分 → m=2.7 → DWELLING(B)。
    setNow(T0 + 2.2 * 60_000);
    runTick();

    expect(store.get(etaPhaseAtom)).toEqual({
      kind: 'DWELLING',
      stationId: 2,
    });
  });

  it('リモート設定が無効ならフェーズは公開しない(null)', () => {
    jest.spyOn(remoteConfigModule, 'isEtaAssistEnabled').mockReturnValue(false);
    renderHook(() => useEtaFallback(), { wrapper });

    setNow(T0 + 1000);
    runTick();

    expect(store.get(etaPhaseAtom)).toBeNull();
  });

  it('アンカーが無ければフェーズは公開しない(null)', () => {
    store.set(etaAnchorAtom, null);
    renderHook(() => useEtaFallback(), { wrapper });

    setNow(T0 + 1000);
    runTick();

    expect(store.get(etaPhaseAtom)).toBeNull();
  });

  it('到着・接近・現在駅・位置は一切駆動しない(GPSが唯一の権威)', () => {
    renderHook(() => useEtaFallback(), { wrapper });

    // ETA上は到着帯(DWELLING)へ進む時刻でも、状態は書き換えないこと。
    setNow(T0 + 2.2 * 60_000);
    runTick();

    // フェーズは公開されるが…
    expect(store.get(etaPhaseAtom)).toEqual({
      kind: 'DWELLING',
      stationId: 2,
    });
    // …到着/接近/現在駅/位置はすべて初期値のまま。
    expect(store.get(arrivedAtom)).toBe(false);
    expect(store.get(approachingAtom)).toBe(false);
    expect(store.get(stationAtom)?.id).toBe(1);
    expect(store.get(locationAtom)).toBe(BASE_LOCATION);
  });
});
