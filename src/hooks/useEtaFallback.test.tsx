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
  lastAcceptedFixAccuracyAtom,
  lastAcceptedFixAtMsAtom,
  lastMovingAtMsAtom,
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
import { MOVING_RECENCY_MS } from '~/utils/etaFallback';
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
// GPS喪失(外れ値/精度劣化)が発動するまでの持続閾値。フック内 GPS_LOST_SUSTAIN_MS と同じ。
const SUSTAIN_MS = 20_000;
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

// GPS喪失(外れ値)が持続閾値を超え、かつ直近に実移動がある状態でフォールバックを発動させる。
// 1tick目で劣化の起点を記録し、2tick目(持続20秒超)で発動する。発動時の仮想時計は
// m = 発車累積0.5 + 22秒 ≒ 0.87 分でまだ走行中(RUNNING)。
const activate = () => {
  setNow(T0 + 1000);
  runTick();
  setNow(T0 + SUSTAIN_MS + 2000);
  runTick();
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

    // 既定: ナビ中・autoMode無効・A発車アンカー・GPS外れ値(=喪失)・直近に実移動あり。
    // lastMovingAtMs は最後の受理測位時刻(T0)と一致させ(実移動は受理測位時にのみ記録される
    // ため lastMovingAtMs <= lastAcceptedFixAtMs が不変条件)、発動ゲート recentlyMoving を満たす。
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
    store.set(lastAcceptedFixAccuracyAtom, 30);
    store.set(lastMovingAtMsAtom, T0);
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

  it('GPS喪失が持続・直近に実移動あり・アンカーありで発動し、発車直後は走行中(未到着・未接近)を駆動する', () => {
    renderHook(() => useEtaFallback(), { wrapper });

    activate();

    expect(store.get(etaFallbackActiveAtom)).toBe(true);
    expect(store.get(arrivedAtom)).toBe(false);
    expect(store.get(approachingAtom)).toBe(false);
    const phase = store.get(etaPhaseAtom);
    expect(phase).toEqual({ kind: 'RUNNING', targetStationId: 2 });
  });

  it('B到着時刻+マージン経過で到着を駆動し、駅座標をlocationAtomへスナップする', () => {
    renderHook(() => useEtaFallback(), { wrapper });

    activate();
    expect(store.get(etaFallbackActiveAtom)).toBe(true);

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

    activate();

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

    activate();
    expect(store.get(etaFallbackActiveAtom)).toBe(true);

    // 800mの測位が受理された(外れ値解除・lastFix更新)が、ヒステリシスで解除しない
    setNow(T0 + SUSTAIN_MS + 3000);
    store.set(locationAccuracyOutlierAtom, false);
    store.set(lastAcceptedFixAtMsAtom, now);
    store.set(lastAcceptedFixAccuracyAtom, 800);
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
    setNow(T0 + SUSTAIN_MS + 4000);
    store.set(lastAcceptedFixAtMsAtom, now);
    store.set(lastAcceptedFixAccuracyAtom, 50);
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
    // 短い上限を設定し、ETAフェーズがまだ返る時刻でcapを踏ませることで、
    // !phase 解除ではなく capExceeded 経路が働くことを確実に検証する。
    jest
      .spyOn(remoteConfigModule, 'getEtaFallbackMaxDurationMin')
      .mockReturnValue(0.01);
    renderHook(() => useEtaFallback(), { wrapper });

    activate();
    expect(store.get(etaFallbackActiveAtom)).toBe(true);

    // 発動(T0+22秒)から0.01分(0.6秒)を超過。ETAフェーズはまだRUNNINGのまま。
    setNow(T0 + SUSTAIN_MS + 3000);
    runTick();
    expect(store.get(etaFallbackActiveAtom)).toBe(false);
  });

  it('リモート設定が無効なら発動しない', () => {
    jest.spyOn(remoteConfigModule, 'isEtaAssistEnabled').mockReturnValue(false);
    renderHook(() => useEtaFallback(), { wrapper });

    activate();

    expect(store.get(etaFallbackActiveAtom)).toBe(false);
    expect(store.get(etaPhaseAtom)).toBeNull();
  });

  it('GPSが健全(外れ値なし・良好精度・受理測位が新しい)なら発動しない', () => {
    store.set(locationAccuracyOutlierAtom, false);
    renderHook(() => useEtaFallback(), { wrapper });

    // 良好測位が流れ続ける限り劣化とみなされず、持続喪失ゲートも成立しない。
    setNow(T0 + 1000);
    store.set(lastAcceptedFixAtMsAtom, now);
    runTick();

    expect(store.get(etaFallbackActiveAtom)).toBe(false);
  });

  it('GPS喪失が一瞬(持続20秒未満)では発動しない', () => {
    renderHook(() => useEtaFallback(), { wrapper });

    // 外れ値だが劣化継続はまだ数秒。持続喪失ゲート(20秒)を満たさないため発動しない。
    setNow(T0 + 1000);
    runTick();
    expect(store.get(etaFallbackActiveAtom)).toBe(false);

    setNow(T0 + 5000);
    runTick();
    expect(store.get(etaFallbackActiveAtom)).toBe(false);
  });

  it('直近に実移動がなければ(駅で静止・待機)GPS喪失が持続しても発動しない', () => {
    // lastMovingAtMs を発動有効期間より前に置く=直近に電車が動いた証拠がない。
    store.set(lastMovingAtMsAtom, T0 - MOVING_RECENCY_MS - 10_000);
    renderHook(() => useEtaFallback(), { wrapper });

    activate();

    // 持続喪失は満たすが recentlyMoving が偽なので発動しない(待機中の誤前進を防ぐ)。
    expect(store.get(etaFallbackActiveAtom)).toBe(false);
  });

  it('AT_STATIONアンカーは estimateEtaPhase の停車判定で予定発車まで駅に留まり、その後前進する', () => {
    // B(id2)に到着した状態でGPSを喪失。ホールドゲートは撤去したが、AT_STATION
    // アンカーは estimateEtaPhase が予定発車まで DWELLING(B) を返すため自然に駅へ留まる。
    store.set(etaAnchorAtom, {
      stationId: 2,
      kind: 'AT_STATION',
      observedAtMs: T0,
    });
    store.set(arrivedAtom, true);
    store.set(stationAtom, STATIONS[1]);
    renderHook(() => useEtaFallback(), { wrapper });

    activate();
    // 発動直後(m≈2.4分)はBの停車帯(effDep=2.5分)なのでBに留まる。
    expect(store.get(etaFallbackActiveAtom)).toBe(true);
    expect(store.get(arrivedAtom)).toBe(true);
    expect(store.get(stationAtom)?.id).toBe(2);

    // 予定発車を過ぎたら(m=4.7分)ETA時計どおり前進し、C(id3)へ到着駆動する。
    // GPSが凍結して位置が動かなくても、待機ではなく走行として表示を進める。
    setNow(T0 + 2.7 * 60_000);
    runTick();

    expect(store.get(stationAtom)?.id).toBe(3);
    expect(store.get(arrivedAtom)).toBe(true);
  });

  it('DWELLING駅がstationsAtom上に見つからない場合は解除して凍結を防ぐ', () => {
    // stationsAtomからBを除くと、B停車帯の駆動時に駅解決できず解除される。
    store.set(stationsAtom, [STATIONS[0], STATIONS[2]]);
    renderHook(() => useEtaFallback(), { wrapper });

    activate();
    expect(store.get(etaFallbackActiveAtom)).toBe(true);

    // B停車帯(m∈[2.5,3.0))へ進める → Bが見つからず解除
    setNow(T0 + 2.2 * 60_000);
    runTick();
    expect(store.get(etaFallbackActiveAtom)).toBe(false);
  });

  it('到着スナップでlocationAtomがaccuracy:0になっても、実測位が劣化中なら解除しない', () => {
    // 精度劣化継続(800m)で発動するケース。外れ値ではなく実測位が流れ続ける。
    const badFix = (ts: number) => {
      store.set(lastAcceptedFixAtMsAtom, ts);
      store.set(lastAcceptedFixAccuracyAtom, 800);
      store.set(locationAtom, {
        timestamp: ts,
        coords: {
          latitude: 35.0,
          longitude: 139.0,
          accuracy: 800,
          altitude: null,
          altitudeAccuracy: null,
          speed: null,
          heading: null,
        },
      });
    };

    store.set(locationAccuracyOutlierAtom, false);
    badFix(T0);
    renderHook(() => useEtaFallback(), { wrapper });

    // 1回目のtickで精度劣化の起点を記録(まだ継続時間0なので発動しない)
    setNow(T0 + 1000);
    badFix(now);
    runTick();
    expect(store.get(etaFallbackActiveAtom)).toBe(false);

    // 精度劣化が20秒継続 → 発動
    setNow(T0 + 22_000);
    badFix(now);
    runTick();
    expect(store.get(etaFallbackActiveAtom)).toBe(true);

    // B到着でスナップが走りlocationAtomはaccuracy:0になる。直後も実測位(800m)は
    // まだ新しいが劣化したまま。locationAtomの精度で見ると誤って解除しうるが、
    // lastAcceptedFixAccuracy(800m)で判定するため解除しない。
    setNow(T0 + 2.2 * 60_000);
    store.set(lastAcceptedFixAtMsAtom, now); // 実測位は届いているが精度は800mのまま
    runTick();
    expect(store.get(locationAtom)?.coords.accuracy).toBe(0); // スナップ済み
    expect(store.get(etaFallbackActiveAtom)).toBe(true); // 早期解除しない
  });
});
