import { act, renderHook } from '@testing-library/react-native';
import type * as Location from 'expo-location';
import { createStore, Provider } from 'jotai';
import type React from 'react';
import type { Station } from '~/@types/graphql';
import { StopCondition } from '~/@types/graphql';
import { createStation } from '~/utils/test/factories';
import { etaAnchorAtom } from '../store/atoms/etaFallback';
import { locationAtom } from '../store/atoms/location';
import {
  arrivedAtom,
  selectedBoundAtom,
  stationAtom,
} from '../store/atoms/station';
import { useEtaAnchor } from './useEtaAnchor';

// AT_STATION の定期更新周期(フック内部定数と同じ5秒)。
const AT_STATION_REFRESH_INTERVAL_MS = 5_000;

// 受理済み測位。observedAtMs はこの timestamp を基準にする
const makeLocation = (timestamp: number): Location.LocationObject => ({
  coords: {
    latitude: 35.0,
    longitude: 139.0,
    accuracy: 20,
    altitude: 0,
    altitudeAccuracy: 0,
    heading: 0,
    speed: null,
  },
  timestamp,
});

const stationA = createStation(1);
const passStation = createStation(2, { stopCondition: StopCondition.Not });
const boundStation = createStation(99);

const renderWithStore = (
  store: ReturnType<typeof createStore>,
  {
    arrived = true,
    station = stationA as Station | null,
    selectedBound = boundStation as Station | null,
    locationTimestamp,
  }: {
    arrived?: boolean;
    station?: Station | null;
    selectedBound?: Station | null;
    /** 受理済み測位の時刻。省略時は測位がまだ無い状態 */
    locationTimestamp?: number;
  } = {}
) => {
  store.set(arrivedAtom, arrived);
  store.set(stationAtom, station);
  store.set(selectedBoundAtom, selectedBound);
  if (locationTimestamp != null) {
    store.set(locationAtom, makeLocation(locationTimestamp));
  }

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

  it('到着中は AT_STATION が記録され、新しい測位を受理するたびに observedAtMs が追随する', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
    const store = createStore();

    renderWithStore(store, {
      arrived: true,
      station: stationA,
      locationTimestamp: 999_000,
    });

    // 打刻は端末時計ではなく受理済み測位の時刻で行う(棄却判定がGPSの時刻軸で回るため)
    expect(store.get(etaAnchorAtom)).toEqual({
      stationId: stationA.id,
      kind: 'AT_STATION',
      observedAtMs: 999_000,
    });

    // 5秒経過。arrived/stationは不変だが、到着を確認し続ける測位が受理されている間は
    // その測位の時刻までobservedAtMsを追随させる
    jest.spyOn(Date, 'now').mockReturnValue(1_005_000);
    act(() => {
      store.set(locationAtom, makeLocation(1_004_000));
      jest.advanceTimersByTime(AT_STATION_REFRESH_INTERVAL_MS);
    });

    expect(store.get(etaAnchorAtom)).toEqual({
      stationId: stationA.id,
      kind: 'AT_STATION',
      observedAtMs: 1_004_000,
    });
  });

  // 受理済み測位が無い間にDate.now()でフォールバック打刻すると、端末時計軸のアンカーが
  // でき、初回測位が届いても下の単調ガードで打ち直されない。棄却判定はGPS軸なので
  // ずれぶん仮想時計が遅れ、DWELLINGに張り付いて凍結が再発する。
  it('受理済み測位が無い間はアンカーを記録しない', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_200_000);
    const store = createStore();

    renderWithStore(store, { arrived: true, station: stationA });
    expect(store.get(etaAnchorAtom)).toBeNull();

    // 初回測位が届いたら、その測位の時刻で記録される
    act(() => {
      store.set(locationAtom, makeLocation(1_199_000));
      jest.advanceTimersByTime(AT_STATION_REFRESH_INTERVAL_MS);
    });

    expect(store.get(etaAnchorAtom)).toEqual({
      stationId: stationA.id,
      kind: 'AT_STATION',
      observedAtMs: 1_199_000,
    });
  });

  // Androidのfused providerはキャッシュ済みの古いfixを返すことがある。基準時刻が巻き戻ると
  // 仮想時計も巻き戻り、一度広がった許容が縮んで棄却が復活する。
  it('アンカーより古い測位では observedAtMs を巻き戻さない', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_300_000);
    const store = createStore();

    renderWithStore(store, {
      arrived: true,
      station: stationA,
      locationTimestamp: 1_300_000,
    });
    expect(store.get(etaAnchorAtom)?.observedAtMs).toBe(1_300_000);

    act(() => {
      store.set(locationAtom, makeLocation(1_290_000));
      jest.advanceTimersByTime(AT_STATION_REFRESH_INTERVAL_MS);
    });

    expect(store.get(etaAnchorAtom)?.observedAtMs).toBe(1_300_000);
  });

  // 回帰: 無条件にDate.now()で打ち直すと、ETAの進行量上限(#6939)が測位を棄却して位置が
  // 凍結した際にarrivedが到着駅で張り付き、基準時刻も一緒に進むため仮想時計が止まる。
  // DWELLINGのまま許容が広がらず、棄却が上限時間(90秒)まで続いて到着表示が遅れた。
  it('測位が受理されなくなったら observedAtMs を進めない(仮想時計を止めない)', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_100_000);
    const store = createStore();

    renderWithStore(store, {
      arrived: true,
      station: stationA,
      locationTimestamp: 1_100_000,
    });
    expect(store.get(etaAnchorAtom)?.observedAtMs).toBe(1_100_000);

    // 位置が凍結している(locationAtomが更新されない)まま時間だけ経過する
    for (let i = 1; i <= 6; i += 1) {
      jest.spyOn(Date, 'now').mockReturnValue(1_100_000 + i * 5_000);
      act(() => {
        jest.advanceTimersByTime(AT_STATION_REFRESH_INTERVAL_MS);
      });
    }

    expect(store.get(etaAnchorAtom)).toEqual({
      stationId: stationA.id,
      kind: 'AT_STATION',
      observedAtMs: 1_100_000,
    });
  });

  it('arrived true→false 遷移で DEPARTED が一発記録され、その後falseのままでは上書きされない', () => {
    jest.spyOn(Date, 'now').mockReturnValue(2_000_000);
    const store = createStore();

    renderWithStore(store, {
      arrived: true,
      station: stationA,
      locationTimestamp: 2_000_000,
    });
    expect(store.get(etaAnchorAtom)?.kind).toBe('AT_STATION');

    // 発車を検出した測位の時刻で打刻される(端末時計の2_001_000ではない)
    jest.spyOn(Date, 'now').mockReturnValue(2_001_000);
    act(() => {
      store.set(locationAtom, makeLocation(2_000_800));
      store.set(arrivedAtom, false);
    });

    expect(store.get(etaAnchorAtom)).toEqual({
      stationId: stationA.id,
      kind: 'DEPARTED',
      observedAtMs: 2_000_800,
    });

    // 発車後、時間が経過してもDEPARTEDのobservedAtMsは上書きされない
    jest.spyOn(Date, 'now').mockReturnValue(2_010_000);
    act(() => {
      store.set(locationAtom, makeLocation(2_009_000));
      jest.advanceTimersByTime(AT_STATION_REFRESH_INTERVAL_MS * 2);
    });

    expect(store.get(etaAnchorAtom)).toEqual({
      stationId: stationA.id,
      kind: 'DEPARTED',
      observedAtMs: 2_000_800,
    });
  });

  it('通過駅への到着ではアンカーが記録されない', () => {
    jest.spyOn(Date, 'now').mockReturnValue(3_000_000);
    const store = createStore();

    renderWithStore(store, {
      arrived: true,
      station: passStation,
      locationTimestamp: 3_000_000,
    });

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

    renderWithStore(store, {
      arrived: true,
      station: passStation,
      locationTimestamp: 3_100_000,
    });
    expect(store.get(etaAnchorAtom)).toBeNull();

    act(() => {
      store.set(arrivedAtom, false);
    });

    expect(store.get(etaAnchorAtom)).toBeNull();
  });

  it('selectedBound が null になると anchor が null にクリアされる', () => {
    jest.spyOn(Date, 'now').mockReturnValue(4_000_000);
    const store = createStore();

    renderWithStore(store, {
      arrived: true,
      station: stationA,
      locationTimestamp: 4_000_000,
    });
    expect(store.get(etaAnchorAtom)).not.toBeNull();

    act(() => {
      store.set(selectedBoundAtom, null);
    });

    expect(store.get(etaAnchorAtom)).toBeNull();
  });
});
