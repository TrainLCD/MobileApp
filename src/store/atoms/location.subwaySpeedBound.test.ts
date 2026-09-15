/**
 * 地下鉄分岐(skipSmoothing)を通る測位にも、ワープ対策の速度フィルタが掛かることを固定する。
 *
 * 分岐そのものは #5661 が平滑化を外すために入れたもので、#5665 が速度フィルタごと外した。
 * 当時は基準がEMA後の座標で追従遅れが変位へ乗っていたうえ、誤棄却からの脱出口
 * (MAX_CONSECUTIVE_SPEED_REJECTIONS / STALE_REFERENCE_MS)も無く、一度弾き始めると位置が
 * 永久に凍結したためで、フィルタが不要と判断されたわけではない。基準が生座標へ移り
 * (#6899)脱出口も揃ったので、測位ノイズぶんを差し引いたうえで検査を掛ける。
 *
 * 座標は都営大江戸線の実測値(StationAPI lineStations)。合成の等間隔路線だと「数km離れた
 * 駅へ張り付く」という地下鉄の誤測位の距離感が出ず、控除量の妥当性を測れない。
 *
 * 限界も明記しておく。許容量は MAX_PLAUSIBLE_SPEED×Δt で、棄却中は基準を更新しないため
 * Δtが伸び続ける。同じ誤った座標が届き続けるクラスタは、いずれ「そこまで移動できた」側へ
 * 入って受理される(このファイルでは固定しない)。運動学だけでは張り付いたクラスタは
 * 止められないというのが #6939 の計測結果で、そこはETAの進行量上限が受け持つ。
 */
import type * as Location from 'expo-location';
import { LineType, type Station } from '~/@types/graphql';
import { store } from '..';
import { etaAnchorAtom, etaStopsAtom } from './etaFallback';
import { locationAtom, resetLocationState, setLocation } from './location';
import stationState from './station';

let mockEtaAssistEnabled = false;
jest.mock('~/lib/remoteConfig', () => ({
  isEtaAssistEnabled: () => mockEtaAssistEnabled,
  getEtaFallbackArrivalConfirmMarginSec: () => 30,
  getMaxPermitAccuracy: () => 1500,
  isForceNotArrivedOnLowAccuracyEnabled: () => true,
}));

// 都営大江戸線 落合南長崎→光が丘(進行方向順)。新江古田→光が丘は約4.1km離れている。
const OEDO_STATIONS: { id: number; name: string; lat: number; lon: number }[] =
  [
    { id: 9930133, name: '落合南長崎', lat: 35.723608, lon: 139.683303 },
    { id: 9930134, name: '新江古田', lat: 35.732538, lon: 139.670653 },
    { id: 9930135, name: '練馬', lat: 35.737404, lon: 139.65477 },
    { id: 9930136, name: '豊島園', lat: 35.742567043044, lon: 139.64894845621 },
    { id: 9930137, name: '練馬春日町', lat: 35.751452, lon: 139.640236 },
    { id: 9930138, name: '光が丘', lat: 35.758526, lon: 139.628603 },
  ];

const stations: Station[] = OEDO_STATIONS.map(
  (s) =>
    ({
      id: s.id,
      name: s.name,
      latitude: s.lat,
      longitude: s.lon,
    }) as Station
);

const at = (name: string) => {
  const found = OEDO_STATIONS.find((s) => s.name === name);
  if (!found) {
    throw new Error(`駅が見つかりません: ${name}`);
  }
  return found;
};

// 坑口付近の基地局測位の帯(scripts/generate-location-gpx.mjs の portalAccuracy)。
// BAD_ACCURACY_THRESHOLD(200m)を超えるので地下鉄分岐へ入る。
const PORTAL_ACCURACY = 300;

const makeLocation = (
  lat: number,
  lon: number,
  timestamp: number,
  accuracy = PORTAL_ACCURACY
): Location.LocationObject => ({
  coords: {
    latitude: lat,
    longitude: lon,
    accuracy,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
  },
  timestamp,
});

const setLineType = (lineType: LineType) => {
  store.set(stationState, {
    ...store.get(stationState),
    station: { line: { lineType } } as Station,
    stations,
  });
};

const currentLatLon = () => {
  const location = store.get(locationAtom);
  return location
    ? [location.coords.latitude, location.coords.longitude]
    : null;
};

const T0 = 1_700_000_000_000;

beforeEach(() => {
  mockEtaAssistEnabled = false;
  resetLocationState();
  store.set(etaAnchorAtom, null);
  store.set(etaStopsAtom, []);
  setLineType(LineType.Subway);
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('地下鉄分岐の速度フィルタ', () => {
  const shinegota = at('新江古田');
  const hikarigaoka = at('光が丘');

  it('数km先の駅へ張り付いた測位を1件目で棄却する', () => {
    setLocation(makeLocation(shinegota.lat, shinegota.lon, T0));

    // 10秒後に約4.1km先(光が丘)の座標が届く ≒ 1470km/h
    setLocation(makeLocation(hikarigaoka.lat, hikarigaoka.lon, T0 + 10_000));

    expect(currentLatLon()).toEqual([shinegota.lat, shinegota.lon]);
  });

  it('精度で説明が付く範囲の揺れは棄却しない', () => {
    // 精度300mの測位2件ぶん(=600m)までは測位ノイズで説明が付くため、1秒間隔でも通す。
    // ここを棄却すると #5665 が分岐ごとフィルタを外す原因になった凍結が再発する。
    setLocation(makeLocation(shinegota.lat, shinegota.lon, T0));

    const jittered = [shinegota.lat + 0.004, shinegota.lon] as const;
    setLocation(makeLocation(jittered[0], jittered[1], T0 + 1_000));

    expect(currentLatLon()).toEqual([jittered[0], jittered[1]]);
  });

  it('受理した測位は次の測位を検査する基準として残る', () => {
    // 基準を更新しないと、地下にいるあいだフィルタが一度も働かない。
    setLocation(makeLocation(shinegota.lat, shinegota.lon, T0));
    // 2件目を受理させる(ノイズ相当の揺れ)
    setLocation(makeLocation(shinegota.lat + 0.001, shinegota.lon, T0 + 1_000));
    // 3件目はその2件目を基準に検査される
    setLocation(makeLocation(hikarigaoka.lat, hikarigaoka.lon, T0 + 11_000));

    expect(currentLatLon()).toEqual([shinegota.lat + 0.001, shinegota.lon]);
  });

  it('地上へ戻った最初の測位はEMAを掛けずに基準を張り直す', () => {
    // 地下鉄分岐はEMAの基準(lastFilteredLocationAtom)を残さないので、地上復帰後の
    // 1件目はノイジーな地下の座標と混ざらず、生の座標がそのまま入る。
    setLocation(makeLocation(shinegota.lat, shinegota.lon, T0));

    setLineType(LineType.Normal);
    const surfaced = at('練馬');
    setLocation(makeLocation(surfaced.lat, surfaced.lon, T0 + 60_000, 20));

    expect(currentLatLon()).toEqual([surfaced.lat, surfaced.lon]);
  });
});

describe('連続棄却による基準の張り直し', () => {
  const shinegota = at('新江古田');
  const hikarigaoka = at('光が丘');

  /** 上限回数ぶん、同じ誤った座標を短い間隔で送り込む */
  const feedRejectedCluster = () => {
    setLocation(makeLocation(shinegota.lat, shinegota.lon, T0));
    for (let i = 1; i <= 6; i += 1) {
      setLocation(
        makeLocation(hikarigaoka.lat, hikarigaoka.lon, T0 + i * 2_000)
      );
    }
  };

  it('ETAが判断できない場合は従来どおり張り直す', () => {
    // ETA補助が無効・アンカーが無い状況では「そこまで進めない」と言える材料が無い。
    // 位置が凍結したまま復帰できなくなるのを避けるため、上限回数で基準を張り直す。
    feedRejectedCluster();

    expect(currentLatLon()).toEqual([hikarigaoka.lat, hikarigaoka.lon]);
  });

  it('ETAが「そこまで進んでいるはずがない」と言う測位では張り直さない', () => {
    mockEtaAssistEnabled = true;
    store.set(
      etaStopsAtom,
      OEDO_STATIONS.map((s, i) => ({
        stationId: s.id,
        cumulativeMinutes: i * 2,
        departureCumulativeMinutes: i * 2 + 0.5,
      }))
    );
    // 新江古田を発車した直後。ETAの許容は次の停車駅(練馬)の1つ先(豊島園)まで。
    store.set(etaAnchorAtom, {
      stationId: at('新江古田').id,
      kind: 'DEPARTED',
      observedAtMs: T0,
    });

    feedRejectedCluster();

    expect(currentLatLon()).toEqual([shinegota.lat, shinegota.lon]);
  });
});
