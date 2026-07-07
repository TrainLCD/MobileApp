import { act, renderHook } from '@testing-library/react-native';
import { Provider } from 'jotai';
import type { ReactNode } from 'react';
import type { Station } from '~/@types/graphql';
import * as remoteConfigModule from '~/lib/remoteConfig';
import { store } from '~/store';
import {
  etaAnchorAtom,
  etaFallbackActiveAtom,
  etaPhaseAtom,
} from '~/store/atoms/etaFallback';
import {
  lastAcceptedFixAtMsAtom,
  locationAccuracyOutlierAtom,
  locationAtom,
} from '~/store/atoms/location';
import { autoModeEnabledAtom } from '~/store/atoms/navigation';
import {
  approachingAtom,
  arrivedAtom,
  selectedBoundAtom,
  stationAtom,
  stationsAtom,
} from '~/store/atoms/station';
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

// stopsHere / 累積分を持つルート stop を最小構成で作る
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

const station = (id: number, lat: number, lng: number): Station =>
  ({
    id,
    groupId: id,
    latitude: lat,
    longitude: lng,
  }) as unknown as Station;

// A(id1) 発 → B(id2, 到着2分/発車2.5分) → C(id3, 到着4分/発車4.5分)
const STOPS = [
  routeStop(1, 0, 0.5),
  routeStop(2, 2, 2.5),
  routeStop(3, 4, 4.5),
];
const STATIONS = [
  station(1, 35.0, 139.0),
  station(2, 35.1, 139.1),
  station(3, 35.2, 139.2),
];

const T0 = 1_000_000;
let now = T0;

const setNow = (value: number) => {
  now = value;
};

// 1tick分だけインターバルを進める。tickはDate.now()を読むので、
// 事前に setNow で仮想時刻を目標へ合わせておけばその時刻で評価される。
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

describe('useEtaFallback', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    now = T0;
    jest.spyOn(Date, 'now').mockImplementation(() => now);

    jest.spyOn(remoteConfigModule, 'isEtaAssistEnabled').mockReturnValue(true);
    jest
      .spyOn(remoteConfigModule, 'getEtaFallbackArrivalConfirmMarginSec')
      .mockReturnValue(30);
    jest
      .spyOn(remoteConfigModule, 'getEtaFallbackMaxDurationMin')
      .mockReturnValue(30);

    mockRoute({ id: 1, stops: STOPS });

    // 既定: ナビ中・autoMode無効・A発車アンカー・GPS外れ値(=喪失)
    store.set(stationsAtom, STATIONS);
    store.set(selectedBoundAtom, station(3, 35.2, 139.2));
    store.set(autoModeEnabledAtom, false);
    store.set(etaAnchorAtom, {
      stationId: 1,
      kind: 'DEPARTED',
      observedAtMs: T0,
    });
    store.set(etaFallbackActiveAtom, false);
    store.set(etaPhaseAtom, null);
    store.set(arrivedAtom, false);
    store.set(approachingAtom, false);
    store.set(stationAtom, STATIONS[0]);
    store.set(locationAccuracyOutlierAtom, true);
    store.set(lastAcceptedFixAtMsAtom, T0);
    store.set(locationAtom, {
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
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('GPS外れ値・アンカーあり・有効時に発動し、発車直後は走行中(未到着・未接近)を駆動する', () => {
    renderHook(() => useEtaFallback(), { wrapper });

    setNow(T0 + 1000); // A発車から1秒: まだB到着(2分)には遠い
    runTick();

    expect(store.get(etaFallbackActiveAtom)).toBe(true);
    expect(store.get(arrivedAtom)).toBe(false);
    expect(store.get(approachingAtom)).toBe(false);
    const phase = store.get(etaPhaseAtom);
    expect(phase).toEqual({ kind: 'RUNNING', targetStationId: 2 });
  });

  it('B到着時刻+マージン経過で到着を駆動し、駅座標をlocationAtomへスナップする', () => {
    renderHook(() => useEtaFallback(), { wrapper });

    // 仮想時計 m = 発車累積0.5 + 経過分。B停車帯は m∈[2.5, 3.0)。
    // 経過2.2分 → m=2.7 → DWELLING(B)。
    setNow(T0 + 2.2 * 60_000);
    runTick();

    expect(store.get(etaFallbackActiveAtom)).toBe(true);
    expect(store.get(arrivedAtom)).toBe(true);
    expect(store.get(approachingAtom)).toBe(false);
    expect(store.get(stationAtom)?.id).toBe(2);
    const loc = store.get(locationAtom);
    expect(loc?.coords.latitude).toBe(35.1);
    expect(loc?.coords.longitude).toBe(139.1);
  });

  it('B到着直前(マージン内)は接近(まもなく)に留める', () => {
    renderHook(() => useEtaFallback(), { wrapper });

    // 仮想時計 m = 発車累積0.5 + 経過分。B接近帯は m∈[到着2.0-lead0.6, 確定2.5)=[1.4,2.5)。
    // 経過1.2分 → m=1.7 → APPROACHING(B)。
    setNow(T0 + 1.2 * 60_000);
    runTick();

    expect(store.get(approachingAtom)).toBe(true);
    expect(store.get(arrivedAtom)).toBe(false);
    expect(store.get(etaPhaseAtom)).toEqual({
      kind: 'APPROACHING',
      targetStationId: 2,
    });
  });

  it('中途半端な測位(200〜1500m)では解除せず、良好測位(≤200m)で解除する', () => {
    renderHook(() => useEtaFallback(), { wrapper });

    setNow(T0 + 1000);
    runTick();
    expect(store.get(etaFallbackActiveAtom)).toBe(true);

    // 800mの測位が受理された(外れ値解除・lastFix更新)が、ヒステリシスで解除しない
    setNow(T0 + 2000);
    store.set(locationAccuracyOutlierAtom, false);
    store.set(lastAcceptedFixAtMsAtom, now);
    store.set(locationAtom, {
      timestamp: now,
      coords: {
        latitude: 35.05,
        longitude: 139.05,
        accuracy: 800,
        altitude: null,
        altitudeAccuracy: null,
        speed: null,
        heading: null,
      },
    });
    runTick();
    expect(store.get(etaFallbackActiveAtom)).toBe(true);

    // 良好測位(50m)を受理 → 解除
    setNow(T0 + 3000);
    store.set(lastAcceptedFixAtMsAtom, now);
    store.set(locationAtom, {
      timestamp: now,
      coords: {
        latitude: 35.05,
        longitude: 139.05,
        accuracy: 50,
        altitude: null,
        altitudeAccuracy: null,
        speed: null,
        heading: null,
      },
    });
    runTick();
    expect(store.get(etaFallbackActiveAtom)).toBe(false);
  });

  it('タイムキャップ(最大継続時間)超過で解除する', () => {
    renderHook(() => useEtaFallback(), { wrapper });

    setNow(T0 + 1000);
    runTick();
    expect(store.get(etaFallbackActiveAtom)).toBe(true);

    // 発動(T0+1秒)から30分を超過 → キャップ超過で解除
    setNow(T0 + 31 * 60_000);
    runTick();
    expect(store.get(etaFallbackActiveAtom)).toBe(false);
  });

  it('リモート設定が無効なら発動しない', () => {
    jest.spyOn(remoteConfigModule, 'isEtaAssistEnabled').mockReturnValue(false);
    renderHook(() => useEtaFallback(), { wrapper });

    setNow(T0 + 1000);
    runTick();

    expect(store.get(etaFallbackActiveAtom)).toBe(false);
    expect(store.get(etaPhaseAtom)).toBeNull();
  });

  it('GPSが健全(外れ値なし・良好精度)なら発動しない', () => {
    store.set(locationAccuracyOutlierAtom, false);
    renderHook(() => useEtaFallback(), { wrapper });

    setNow(T0 + 1000);
    runTick();

    expect(store.get(etaFallbackActiveAtom)).toBe(false);
  });
});
