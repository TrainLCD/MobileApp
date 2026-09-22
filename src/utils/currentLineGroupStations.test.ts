import type { Station } from '~/@types/graphql';
import { getCurrentLineGroupStations } from './currentLineGroupStations';

const station = (id: number, groupId: number | null): Station =>
  ({
    id,
    groupId: id,
    trainType: groupId == null ? null : { groupId },
  }) as unknown as Station;

describe('getCurrentLineGroupStations', () => {
  it('1 系統だけの駅リストはそのまま返す', () => {
    const stations = [station(1, 100), station(2, null), station(3, 100)];

    const result = getCurrentLineGroupStations(stations, stations[1]);

    expect(result.stations).toBe(stations);
    expect(result.groupId).toBe(100);
  });

  it('種別の無い駅リストはそのまま返す', () => {
    const stations = [station(1, null), station(2, null)];

    const result = getCurrentLineGroupStations(stations, stations[0]);

    expect(result.stations).toBe(stations);
    expect(result.groupId).toBeNull();
  });

  describe('乗換経路をつないだ駅リスト', () => {
    // 1〜3 が 1 区間目の系統 100、4 は通過駅、5〜6 が 2 区間目の系統 200
    const stations = [
      station(1, 100),
      station(2, 100),
      station(3, 200),
      station(4, null),
      station(5, 200),
    ];

    it('現在駅を含む系統の範囲だけを返す', () => {
      const result = getCurrentLineGroupStations(stations, stations[1]);

      expect(result.stations.map((s) => s.id)).toEqual([1, 2]);
      expect(result.groupId).toBe(100);
    });

    it('乗換駅からは次の系統の範囲を返し、通過駅も範囲に含める', () => {
      const result = getCurrentLineGroupStations(stations, stations[2]);

      expect(result.stations.map((s) => s.id)).toEqual([3, 4, 5]);
      expect(result.groupId).toBe(200);
    });

    it('現在駅が駅リストに無ければ最初の範囲を返す', () => {
      const result = getCurrentLineGroupStations(stations, station(99, 100));

      expect(result.stations.map((s) => s.id)).toEqual([1, 2]);
    });
  });
});
