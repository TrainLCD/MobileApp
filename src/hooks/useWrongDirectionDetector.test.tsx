/** biome-ignore-all lint/suspicious/noExplicitAny: テストコードまで型安全にするのはつらい */
import { act, renderHook } from '@testing-library/react-native';
import type * as Location from 'expo-location';
import { Provider, useAtomValue } from 'jotai';
import { createStore } from 'jotai/vanilla';
import type React from 'react';
import type { Station } from '~/@types/graphql';
import { locationAtom } from '~/store/atoms/location';
import navigationState from '~/store/atoms/navigation';
import notifyState from '~/store/atoms/notify';
import stationState from '~/store/atoms/station';
import wrongDirectionAtom from '~/store/atoms/wrongDirection';
import { useLoopLine } from './useLoopLine';
import { useNextStation } from './useNextStation';
import {
  useWrongDirectionDetector,
  useWrongDirectionDetectorEffect,
} from './useWrongDirectionDetector';

jest.mock('./useNextStation', () => ({
  __esModule: true,
  useNextStation: jest.fn(),
}));

jest.mock('./useLoopLine', () => ({
  __esModule: true,
  useLoopLine: jest.fn(),
}));

const mockUseNextStation = useNextStation as jest.MockedFunction<
  typeof useNextStation
>;
const mockUseLoopLine = useLoopLine as jest.MockedFunction<typeof useLoopLine>;

// 緯度1度 ≒ 111,320m の前提で、東向き(経度)に進む点を作る
// 0.0001 度 ≒ 11.13 m
const BASE_LAT = 35.0;
const BASE_LON = 135.0;
const NEXT_STATION_LON = 135.005; // 約 556m 東にある「次駅」
const NEXT_STATION: Station = {
  id: 999,
  groupId: 999,
  name: '次駅',
  nameRoman: 'Next',
  latitude: BASE_LAT,
  longitude: NEXT_STATION_LON,
} as Station;

const makeLocation = (
  lon: number,
  accuracy = 10,
  timestamp = Date.now()
): Location.LocationObject => ({
  coords: {
    latitude: BASE_LAT,
    longitude: lon,
    accuracy,
    altitude: 0,
    altitudeAccuracy: 0,
    heading: 0,
    speed: 0,
  },
  timestamp,
});

const seedStore = (
  store: ReturnType<typeof createStore>,
  { wrongDirectionNotifyEnabled = true } = {}
) => {
  // 「逆走通知が動くべき」前提条件を満たす状態を作る
  store.set(stationState, {
    arrived: false,
    approaching: false,
    station: null,
    stations: [],
    stationsCache: [],
    pendingStation: null,
    pendingStations: [],
    selectedDirection: 'INBOUND',
    // selectedBound は id があれば十分。型を満たすため最小限に。
    selectedBound: { id: 1 } as Station,
    wantedDestination: null,
  });
  store.set(navigationState, (prev) => ({
    ...prev,
    autoModeEnabled: false,
  }));
  store.set(notifyState, {
    targetStationIds: [],
    wrongDirectionNotifyEnabled,
  });
};

const setLocationLon = (
  store: ReturnType<typeof createStore>,
  lon: number,
  accuracy = 10
) => {
  store.set(
    locationAtom,
    makeLocation(
      lon,
      accuracy,
      store.get(locationAtom)?.timestamp
        ? (store.get(locationAtom) as Location.LocationObject).timestamp + 1000
        : 1000
    )
  );
};

const renderDetector = (store: ReturnType<typeof createStore>) => {
  const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Provider store={store}>{children}</Provider>
  );
  return renderHook(
    () => {
      useWrongDirectionDetectorEffect();
      return useAtomValue(wrongDirectionAtom);
    },
    { wrapper }
  );
};

describe('useWrongDirectionDetector (hysteresis)', () => {
  beforeEach(() => {
    mockUseLoopLine.mockReturnValue({
      isLoopLine: false,
      isYamanoteLine: false,
      isOsakaLoopLine: false,
      isMeijoLine: false,
      isOedoLine: false,
      isPartiallyLoopLine: false,
      inboundStationsForLoopLine: [],
      outboundStationsForLoopLine: [],
    });
    mockUseNextStation.mockReturnValue(NEXT_STATION);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const advanceWest = (
    store: ReturnType<typeof createStore>,
    deltaLonSteps: number[]
  ) => {
    // 東に向かうべきところを「西に進む = 逆方向」として、経度を負方向にずらす
    let lon = BASE_LON;
    for (const step of deltaLonSteps) {
      lon += step;
      act(() => setLocationLon(store, lon));
    }
  };

  it('4回連続で次駅から遠ざかり、累積300m以上で逆方向と判定する', () => {
    const store = createStore();
    seedStore(store);

    const { result } = renderDetector(store);

    // 初回位置を打ち込む（比較対象を作るため、判定はまだ走らない）
    act(() => setLocationLon(store, BASE_LON));

    // 1ステップ ≒ 100m 西進 (経度 -0.001 ≒ -85m。安全に余裕を持って-0.001)
    advanceWest(store, [-0.001, -0.001, -0.001, -0.001, -0.001]);

    expect(result.current.isWrongDirection).toBe(true);
    expect(result.current.isLoopLineWrongDirection).toBe(false);
  });

  it('一度逆方向と判定された後、小さなGPSノイズ(数m以内の前進)で判定が解除されない', () => {
    const store = createStore();
    seedStore(store);

    const { result } = renderDetector(store);

    act(() => setLocationLon(store, BASE_LON));
    advanceWest(store, [-0.001, -0.001, -0.001, -0.001, -0.001]);
    expect(result.current.isWrongDirection).toBe(true);

    // ノイズトレランス(10m)以内のごく小さな前進(東向き)を加える
    // 0.00005 度 ≒ 5.5m
    act(() => {
      const prev = store.get(locationAtom) as Location.LocationObject;
      store.set(locationAtom, {
        ...prev,
        coords: { ...prev.coords, longitude: prev.coords.longitude + 0.00005 },
        timestamp: prev.timestamp + 1000,
      });
    });

    // ノイズで判定は解除されない
    expect(result.current.isWrongDirection).toBe(true);
  });

  it('到着フラグが立つと判定がリセットされる', () => {
    const store = createStore();
    seedStore(store);

    const { result } = renderDetector(store);

    act(() => setLocationLon(store, BASE_LON));
    advanceWest(store, [-0.001, -0.001, -0.001, -0.001, -0.001]);
    expect(result.current.isWrongDirection).toBe(true);

    act(() => {
      store.set(stationState, (prev) => ({ ...prev, arrived: true }));
    });

    expect(result.current.isWrongDirection).toBe(false);
  });

  it('wrongDirectionNotifyEnabled が false のときは逆方向と判定されない', () => {
    const store = createStore();
    seedStore(store, { wrongDirectionNotifyEnabled: false });

    const { result } = renderDetector(store);

    act(() => setLocationLon(store, BASE_LON));
    advanceWest(store, [-0.001, -0.001, -0.001, -0.001, -0.001]);

    expect(result.current.isWrongDirection).toBe(false);
    expect(result.current.isLoopLineWrongDirection).toBe(false);
  });

  it('逆方向と判定された状態で wrongDirectionNotifyEnabled が false に変わるとリセットされる', () => {
    const store = createStore();
    seedStore(store);

    const { result } = renderDetector(store);

    act(() => setLocationLon(store, BASE_LON));
    advanceWest(store, [-0.001, -0.001, -0.001, -0.001, -0.001]);
    expect(result.current.isWrongDirection).toBe(true);

    act(() => {
      store.set(notifyState, (prev) => ({
        ...prev,
        wrongDirectionNotifyEnabled: false,
      }));
    });

    expect(result.current.isWrongDirection).toBe(false);
    expect(result.current.isLoopLineWrongDirection).toBe(false);
  });

  it('公開フックは atom を読むだけで、Effectフックを呼ばなくても初期値を返す', () => {
    const store = createStore();
    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <Provider store={store}>{children}</Provider>
    );
    const { result } = renderHook(() => useWrongDirectionDetector(), {
      wrapper,
    });
    expect(result.current).toEqual({
      isWrongDirection: false,
      isLoopLineWrongDirection: false,
    });
  });
});
