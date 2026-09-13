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

  // 回帰: 地下鉄の急行は「発車を観測できないまま次の停車駅で測位が復活する」のが普通で、
  // 許容をindex差で数えていると通過駅ぶんだけ目減りし、正常な測位を上限時間まで弾き続けた。
  // さらに位置が凍結するとarrivedが到着駅で張り付き、useEtaAnchorの打ち直しで仮想時計まで
  // 止まるため、DWELLINGの許容から自力で抜けられない(#6939の90秒を毎停車で使い切る)。
  describe('通過駅を跨ぐ急行', () => {
    // 停車駅は id 1(idx0) / 5(idx4) / 7(idx6) / 9(idx8)。間は通過駅
    const expressStopIdx = [0, 4, 6, 8];

    const setupExpressRoute = () => {
      store.set(
        etaStopsAtom,
        expressStopIdx.map((idx, n) => ({
          stationId: stations[idx].id as number,
          cumulativeMinutes: n * 3,
          departureCumulativeMinutes: n * 3 + 0.5,
        }))
      );
    };

    it('停車中のまま発車し、次の停車駅で測位が復活しても棄却しない', () => {
      const t0 = 6_000_000;
      setupExpressRoute();
      // 始発駅(idx0)に到着中。仮想時計は停車中を指したまま
      store.set(etaAnchorAtom, {
        stationId: stations[0].id as number,
        kind: 'AT_STATION',
        observedAtMs: t0,
      });
      setLocation(makeLocation(stations[0].latitude as number, t0));

      // 発車後、トンネルで測位が途切れ、次の停車駅(idx4)で復活する
      const next = stations[4].latitude as number;
      setLocation(makeLocation(next, t0 + 10_000));

      expect(store.get(locationAtom)?.coords.latitude).toBe(next);
    });

    // 保険(ETA_BOUND_MAX_HOLD_MS)が停車駅単位の許容でも効くこと。各停側は上の
    // 「上限時間を過ぎたら棄却を打ち切り」が見ているが、stopStationIdsを渡す経路は
    // 許容の算出が別分岐なので別に固定する。
    it('ETA側が大きく誤っていても上限時間で棄却を打ち切る', () => {
      const t0 = 8_000_000;
      // 停車駅間を60分と見積もった(実際よりはるかに遅い)ETA。仮想時計が進んでも
      // 対象駅が追いつかないため、許容内へ入るのは上限時間の打ち切りだけになる
      store.set(
        etaStopsAtom,
        expressStopIdx.map((idx, n) => ({
          stationId: stations[idx].id as number,
          cumulativeMinutes: n * 60,
          departureCumulativeMinutes: n * 60 + 0.5,
        }))
      );
      store.set(etaAnchorAtom, {
        stationId: stations[0].id as number,
        kind: 'AT_STATION',
        observedAtMs: t0,
      });
      setLocation(makeLocation(stations[0].latitude as number, t0));
      const before = store.get(locationAtom)?.coords.latitude;

      // 3つ先の停車駅(idx8)。対象駅(idx4)の次の停車駅(idx6)より先なので棄却される
      const far = stations[8].latitude as number;
      setLocation(makeLocation(far, t0 + 10_000));
      expect(store.get(locationAtom)?.coords.latitude).toBe(before);

      setLocation(makeLocation(far, t0 + 10_000 + 90_000));
      expect(store.get(locationAtom)?.coords.latitude).toBe(far);
    });

    it('2つ先の停車駅を指す測位は棄却する', () => {
      const t0 = 7_000_000;
      setupExpressRoute();
      store.set(etaAnchorAtom, {
        stationId: stations[0].id as number,
        kind: 'AT_STATION',
        observedAtMs: t0,
      });
      setLocation(makeLocation(stations[0].latitude as number, t0));
      const before = store.get(locationAtom)?.coords.latitude;

      setLocation(makeLocation(stations[6].latitude as number, t0 + 10_000));

      expect(store.get(locationAtom)?.coords.latitude).toBe(before);
    });
  });
});
