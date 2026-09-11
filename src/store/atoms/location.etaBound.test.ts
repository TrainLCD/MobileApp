import type * as Location from 'expo-location';
import { LineType, type Station } from '~/@types/graphql';
import { store } from '..';
import { etaAnchorAtom, etaStopsAtom } from './etaFallback';
import { locationAtom, resetLocationState, setLocation } from './location';
import stationState from './station';

// ETA補助は既定で無効(remoteConfigのフォールバックがfalse)なので、有効な場合の挙動を測る
jest.mock('~/lib/remoteConfig', () => ({
  isEtaAssistEnabled: () => true,
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

  it('アンカーが無い場合は判定せず従来どおり反映する', () => {
    const t0 = 3_000_000;
    store.set(etaAnchorAtom, null);

    setLocation(makeLocation(stations[1].latitude as number, t0 + 1_000));
    const far = stations[5].latitude as number;
    setLocation(makeLocation(far, t0 + 11_000));

    expect(store.get(locationAtom)?.coords.latitude).toBe(far);
  });
});
