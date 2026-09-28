import getDistance from 'geolib/es/getDistance';
import {
  rememberTrackDistances,
  resetTrackDistancesForTesting,
} from '~/lib/trackDistances';
import { createStation } from '~/utils/test/factories';
import { getRideDistanceMeters, measureRideDistance } from './rideDistance';

// 経度方向に約1kmずつ離れた駅を並べる
const at = (id: number, lon: number) =>
  createStation(id, { latitude: 35.68, longitude: lon });

const a = at(1, 139.7);
const b = at(2, 139.711);
const c = at(3, 139.722);
const d = at(4, 139.733);
const stations = [a, b, c, d];

const d2 = (p: typeof a, q: typeof a) =>
  getDistance(
    { latitude: p.latitude as number, longitude: p.longitude as number },
    { latitude: q.latitude as number, longitude: q.longitude as number }
  );

describe('getRideDistanceMeters', () => {
  it('隣り合う駅は2駅の直線距離になる', () => {
    expect(getRideDistanceMeters(stations, a, b, false)).toBe(d2(a, b));
  });

  it('途中の駅を検出できなかった区間は、あいだの駅をたどって合計する', () => {
    expect(getRideDistanceMeters(stations, a, d, false)).toBe(
      d2(a, b) + d2(b, c) + d2(c, d)
    );
  });

  it('逆向きに進んでも同じ距離になる', () => {
    expect(getRideDistanceMeters(stations, d, b, false)).toBe(
      d2(b, c) + d2(c, d)
    );
  });

  it('同じ駅なら0', () => {
    expect(getRideDistanceMeters(stations, b, b, false)).toBe(0);
  });

  it('座標の無い駅は飛ばして前後の駅をつなぐ', () => {
    const noCoords = createStation(2);
    expect(getRideDistanceMeters([a, noCoords, c], a, c, false)).toBe(d2(a, c));
  });

  it('リストに無い駅が相手なら2駅の直線距離にする', () => {
    const outside = at(9, 139.8);
    expect(getRideDistanceMeters(stations, a, outside, false)).toBe(
      d2(a, outside)
    );
  });

  it('環状線は短い方の回り方をとる', () => {
    // 末尾(d)から先頭(a)へ進んだ場合、配列を逆にたどるより折り返す方が短い
    expect(getRideDistanceMeters(stations, d, a, true)).toBe(d2(d, a));
  });

  describe('線路の長さ', () => {
    afterEach(() => {
      resetTrackDistancesForTesting();
    });

    // API は a→b→c→d の並びで、直前の駅からの線路の長さを返す
    const rememberAll = () =>
      rememberTrackDistances([
        { id: 1, trackDistanceFromPrevious: null },
        { id: 2, trackDistanceFromPrevious: 1500 },
        { id: 3, trackDistanceFromPrevious: 1600 },
        { id: 4, trackDistanceFromPrevious: 1700 },
      ]);

    it('隣り合う駅の線路の長さがあればそれを合計する', () => {
      rememberAll();
      expect(measureRideDistance(stations, a, d, false)).toEqual({
        meters: 1500 + 1600 + 1700,
        source: 'track',
      });
    });

    it('並びが API と逆向きでも、同じ組の線路の長さを使う', () => {
      rememberAll();
      const reversed = [d, c, b, a];
      expect(measureRideDistance(reversed, c, a, false)).toEqual({
        meters: 1600 + 1500,
        source: 'track',
      });
    });

    it('線路の長さが無い区間だけ直線距離で代え、mixed にする', () => {
      rememberTrackDistances([
        { id: 1, trackDistanceFromPrevious: null },
        { id: 2, trackDistanceFromPrevious: 1500 },
      ]);
      expect(measureRideDistance(stations, a, c, false)).toEqual({
        meters: 1500 + d2(b, c),
        source: 'mixed',
      });
    });

    it('座標の無い駅のあとで線路の長さが途切れたら、座標のある駅どうしの直線距離でまとめて代える', () => {
      // a→b は線路の長さあり、b は座標なし、b→c は線路の長さなし
      const noCoordsB = { id: 2, latitude: null, longitude: null };
      rememberTrackDistances([
        { id: 1, trackDistanceFromPrevious: null },
        { id: 2, trackDistanceFromPrevious: 1500 },
      ]);
      expect(measureRideDistance([a, noCoordsB, c], a, c, false)).toEqual({
        // a→b の線路の長さを足したまま a→c を足すと二重に数えるので、取り消す
        meters: d2(a, c),
        source: 'haversine',
      });
    });

    it('座標の無い駅の手前で線路の長さが途切れても、同じく直線距離でまとめて代える', () => {
      // a→b は線路の長さなし、b は座標なし、b→c は線路の長さあり
      const noCoordsB = { id: 2, latitude: null, longitude: null };
      rememberTrackDistances([
        { id: 2, trackDistanceFromPrevious: null },
        { id: 3, trackDistanceFromPrevious: 1600 },
      ]);
      expect(measureRideDistance([a, noCoordsB, c], a, c, false)).toEqual({
        meters: d2(a, c),
        source: 'haversine',
      });
    });

    it('座標のある駅から先の線路の長さは、直線距離で代えずに使う', () => {
      // a→b は線路の長さなし(直線距離)、b→c は線路の長さあり
      rememberTrackDistances([
        { id: 2, trackDistanceFromPrevious: null },
        { id: 3, trackDistanceFromPrevious: 1600 },
      ]);
      expect(measureRideDistance(stations, a, c, false)).toEqual({
        meters: d2(a, b) + 1600,
        source: 'mixed',
      });
    });

    it('線路の長さを1つも知らなければ haversine', () => {
      expect(measureRideDistance(stations, a, c, false)).toEqual({
        meters: d2(a, b) + d2(b, c),
        source: 'haversine',
      });
    });
  });
});
