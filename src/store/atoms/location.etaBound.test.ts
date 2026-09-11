import type * as Location from 'expo-location';
import { LineType, type Station } from '~/@types/graphql';
import { store } from '..';
import { etaAnchorAtom, etaStopsAtom } from './etaFallback';
import { locationAtom, resetLocationState, setLocation } from './location';
import stationState from './station';

// ETA補助は既定で無効(remoteConfigのフォールバックがfalse)なので、有効な場合の挙動を測る。
// 無効時に一切干渉しないことも確認するため、フラグで切り替えられるようにする。
let mockEtaAssistEnabled = true;
jest.mock('~/lib/remoteConfig', () => ({
  isEtaAssistEnabled: () => mockEtaAssistEnabled,
  getEtaFallbackArrivalConfirmMarginSec: () => 30,
  getMaxPermitAccuracy: () => 1500,
  isForceNotArrivedOnLowAccuracyEnabled: () => true,
}));

const METERS_PER_DEG_LAT = 111_320;
const STATION_INTERVAL_M = 1_100;

// 1.1km間隔で南北に並ぶ10駅の路線
const stations: Station[] = Array.from(
  { length: 10 },
  (_, i) =>
    ({
      id: i + 1,
      latitude: 35.0 + (i * STATION_INTERVAL_M) / METERS_PER_DEG_LAT,
      longitude: 139.0,
    }) as Station
);

const makeLocation = (
  lat: number,
  timestamp: number,
  accuracy = 300
): Location.LocationObject => ({
  coords: {
    latitude: lat,
    longitude: 139.0,
    accuracy,
    altitude: 0,
    altitudeAccuracy: 0,
    heading: 0,
    speed: null,
  },
  timestamp,
});

const setupRoute = () => {
  store.set(stationState, {
    arrived: true,
    approaching: false,
    station: { line: { lineType: LineType.Subway } } as Station,
    stations,
    stationsCache: [],
    pendingStation: null,
    pendingStations: [],
    selectedDirection: null,
    selectedBound: null,
    wantedDestination: null,
  });
  // 2分間隔で停車していく想定のETA
  store.set(
    etaStopsAtom,
    stations.map((s, i) => ({
      stationId: s.id as number,
      cumulativeMinutes: i * 2,
      departureCumulativeMinutes: i * 2 + 0.5,
    }))
  );
};

describe('ETAの進行量上限による棄却', () => {
  beforeEach(() => {
    mockEtaAssistEnabled = true;
    resetLocationState();
    setupRoute();
  });

  it('ETAが示す進行量を大きく超える測位は反映しない', () => {
    const t0 = 1_000_000;
    // 2駅目を発車した直後
    store.set(etaAnchorAtom, {
      stationId: 2,
      kind: 'DEPARTED',
      observedAtMs: t0,
    });

    // まず2駅目付近の測位で基準を作る
    setLocation(makeLocation(stations[1].latitude as number, t0 + 1_000));
    const before = store.get(locationAtom)?.coords.latitude;

    // 10秒後、6駅目付近(=4駅先)の座標が届く
    setLocation(makeLocation(stations[5].latitude as number, t0 + 11_000));

    expect(store.get(locationAtom)?.coords.latitude).toBe(before);
  });

  it('ETAが示す進行量の範囲内なら反映する', () => {
    const t0 = 2_000_000;
    store.set(etaAnchorAtom, {
      stationId: 2,
      kind: 'DEPARTED',
      observedAtMs: t0,
    });

    setLocation(makeLocation(stations[1].latitude as number, t0 + 1_000));

    // 10秒後、3駅目付近(=次の停車駅)の座標が届く
    const next = stations[2].latitude as number;
    setLocation(makeLocation(next, t0 + 11_000));

    expect(store.get(locationAtom)?.coords.latitude).toBe(next);
  });

  // 回帰: 上限時間の打ち切りが「1件だけ受理して棄却を再開する」実装だと、
  // 範囲外の測位が90秒に1件しか通らず、位置が実質凍結したままになる。
  it('上限時間を過ぎたら棄却を打ち切り、その後の範囲外測位も続けて反映する', () => {
    const t0 = 4_000_000;
    store.set(etaAnchorAtom, {
      stationId: 2,
      kind: 'DEPARTED',
      observedAtMs: t0,
    });
    setLocation(makeLocation(stations[1].latitude as number, t0 + 1_000));

    const far = stations[5].latitude as number;
    // 範囲外の測位が届き続ける
    setLocation(makeLocation(far, t0 + 11_000));
    expect(store.get(locationAtom)?.coords.latitude).not.toBe(far);

    // 上限(90秒)到達で打ち切り、受理する
    setLocation(makeLocation(far, t0 + 11_000 + 90_000));
    expect(store.get(locationAtom)?.coords.latitude).toBe(far);

    // 打ち切り後は、直後の範囲外測位も続けて反映される
    const farther = stations[6].latitude as number;
    setLocation(makeLocation(farther, t0 + 11_000 + 91_000));
    expect(store.get(locationAtom)?.coords.latitude).toBe(farther);
  });

  it('打ち切り後に範囲内の測位が届いたら、再び範囲外を棄却する', () => {
    const t0 = 5_000_000;
    store.set(etaAnchorAtom, {
      stationId: 2,
      kind: 'DEPARTED',
      observedAtMs: t0,
    });
    setLocation(makeLocation(stations[1].latitude as number, t0 + 1_000));

    const far = stations[5].latitude as number;
    setLocation(makeLocation(far, t0 + 11_000));
    setLocation(makeLocation(far, t0 + 11_000 + 90_000));
    expect(store.get(locationAtom)?.coords.latitude).toBe(far);

    // 範囲内へ戻る(ETAを再び信用できる状態)
    const inRange = stations[2].latitude as number;
    setLocation(makeLocation(inRange, t0 + 11_000 + 91_000));
    expect(store.get(locationAtom)?.coords.latitude).toBe(inRange);

    // 再び範囲外が届いたら棄却する
    setLocation(
      makeLocation(stations[6].latitude as number, t0 + 11_000 + 92_000)
    );
    expect(store.get(locationAtom)?.coords.latitude).toBe(inRange);
  });

  it('打ち切り後でもアンカーが張り直されたら再び棄却する', () => {
    const t0 = 6_000_000;
    store.set(etaAnchorAtom, {
      stationId: 2,
      kind: 'DEPARTED',
      observedAtMs: t0,
    });
    setLocation(makeLocation(stations[1].latitude as number, t0 + 1_000));

    const far = stations[5].latitude as number;
    setLocation(makeLocation(far, t0 + 11_000));
    setLocation(makeLocation(far, t0 + 11_000 + 90_000));
    expect(store.get(locationAtom)?.coords.latitude).toBe(far);

    // 次の駅へ到着してアンカーが張り直された
    store.set(etaAnchorAtom, {
      stationId: 3,
      kind: 'AT_STATION',
      observedAtMs: t0 + 11_000 + 91_000,
    });
    const held = store.get(locationAtom)?.coords.latitude;
    setLocation(
      makeLocation(stations[8].latitude as number, t0 + 11_000 + 92_000)
    );
    expect(store.get(locationAtom)?.coords.latitude).toBe(held);
  });

  it('ETA補助が無効なら判定せず従来どおり反映する', () => {
    mockEtaAssistEnabled = false;
    const t0 = 7_000_000;
    store.set(etaAnchorAtom, {
      stationId: 2,
      kind: 'DEPARTED',
      observedAtMs: t0,
    });

    setLocation(makeLocation(stations[1].latitude as number, t0 + 1_000));
    const far = stations[5].latitude as number;
    setLocation(makeLocation(far, t0 + 11_000));

    expect(store.get(locationAtom)?.coords.latitude).toBe(far);
  });

  it('アンカーが無い場合は判定せず従来どおり反映する', () => {
    const t0 = 3_000_000;
    store.set(etaAnchorAtom, null);

    setLocation(makeLocation(stations[1].latitude as number, t0 + 1_000));
    const far = stations[5].latitude as number;
    setLocation(makeLocation(far, t0 + 11_000));

    expect(store.get(locationAtom)?.coords.latitude).toBe(far);
  });
});
