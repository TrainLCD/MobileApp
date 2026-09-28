import getDistance from 'geolib/es/getDistance';
import { createStation } from '~/utils/test/factories';
import { getRideDistanceMeters } from './rideDistance';

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
});
