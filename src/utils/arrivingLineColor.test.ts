import type { Station } from '~/@types/graphql';
import { getArrivingLineColor } from './arrivingLineColor';

const OEDO = '#b6007a';
const YAMANOTE = '#9acd32';

const station = (id: number, groupId: number, color: string): Station =>
  ({ id, groupId, line: { color } }) as unknown as Station;

describe('getArrivingLineColor', () => {
  // 新宿(大江戸線) → 代々木(大江戸線) → 代々木(山手線) → 原宿(山手線)
  const shinjuku = station(1, 100, OEDO);
  const yoyogiOedo = station(2, 200, OEDO);
  const yoyogiYamanote = station(3, 200, YAMANOTE);
  const harajuku = station(4, 300, YAMANOTE);
  const stations = [shinjuku, yoyogiOedo, yoyogiYamanote, harajuku];

  it('INBOUNDで接続駅に着いた後は前の路線の色を返す', () => {
    expect(getArrivingLineColor(stations, 'INBOUND', yoyogiYamanote)).toBe(
      OEDO
    );
  });

  it('OUTBOUNDで接続駅に着いた後は前の路線の色を返す', () => {
    const reversed = [harajuku, yoyogiYamanote, yoyogiOedo, shinjuku];
    expect(getArrivingLineColor(reversed, 'OUTBOUND', yoyogiYamanote)).toBe(
      OEDO
    );
  });

  it('接続駅でなければ先頭の駅の路線の色を返す', () => {
    expect(getArrivingLineColor(stations, 'INBOUND', harajuku)).toBe(YAMANOTE);
  });

  it('前の路線の接続駅が先頭ならその駅の路線の色を返す', () => {
    expect(getArrivingLineColor(stations, 'INBOUND', yoyogiOedo)).toBe(OEDO);
  });

  it('先頭の駅が駅リストに無ければ先頭の駅の路線の色を返す', () => {
    expect(getArrivingLineColor([], 'INBOUND', yoyogiYamanote)).toBe(YAMANOTE);
  });

  it('先頭の駅が無ければundefinedを返す', () => {
    expect(
      getArrivingLineColor(stations, 'INBOUND', undefined)
    ).toBeUndefined();
  });
});
