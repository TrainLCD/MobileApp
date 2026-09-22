import type { Station } from '~/@types/graphql';
import {
  alignConnectedTrainRouteSegments,
  buildRouteLegInputs,
  getCurrentLineGroupStations,
} from './currentLineGroupStations';

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

describe('乗換経路の区間指定', () => {
  const OEDO = 99301;
  const SAIKYO = 11321;
  // 乗換駅(新宿)は次の区間(埼京線)の駅として 1 度だけ持ち、lines から大江戸線の新宿を引ける
  const stationOn = (
    id: number,
    lineId: number,
    groupId: number | null,
    lines: { id: number; stationId: number }[] = []
  ): Station =>
    ({
      id,
      groupId: id,
      line: { id: lineId },
      lines: lines.map((l) => ({ id: l.id, station: { id: l.stationId } })),
      trainType: groupId == null ? null : { groupId },
    }) as unknown as Station;
  const hikarigaoka = stationOn(9930138, OEDO, 1000099301);
  const tochomae = stationOn(9930100, OEDO, 1000099301);
  const shinjuku = stationOn(1132104, SAIKYO, 170, [
    { id: SAIKYO, stationId: 1132104 },
    { id: OEDO, stationId: 9930128 },
  ]);
  const shibuya = stationOn(1132103, SAIKYO, 170);
  const joined = [hikarigaoka, tochomae, shinjuku, shibuya];

  describe('buildRouteLegInputs', () => {
    it('区間ごとの系統と乗降駅を並べ、前の区間の降車駅は乗換駅の lines から引く', () => {
      expect(buildRouteLegInputs(joined)).toEqual([
        {
          lineGroupId: 1000099301,
          fromStationId: 9930138,
          toStationId: 9930128,
        },
        { lineGroupId: 170, fromStationId: 1132104, toStationId: 1132103 },
      ]);
    });

    it('1 系統だけの駅リストでは null を返す', () => {
      expect(buildRouteLegInputs([hikarigaoka, tochomae])).toBeNull();
    });

    it('乗換駅の lines に前の区間の路線が無ければ null を返す', () => {
      const withoutOedo = stationOn(1132104, SAIKYO, 170);
      expect(
        buildRouteLegInputs([hikarigaoka, tochomae, withoutOedo, shibuya])
      ).toBeNull();
    });
  });

  describe('alignConnectedTrainRouteSegments', () => {
    it('次の区間の乗車駅の分を捨てて駅リストの並びに揃える', () => {
      // API: [光が丘, 都庁前, 新宿(大江戸線)] + [新宿(埼京線), 渋谷]
      const segments = [
        '光が丘',
        '都庁前',
        '新宿(大江戸線)',
        '新宿(埼京線)',
        '渋谷',
      ];

      expect(alignConnectedTrainRouteSegments(segments, joined)).toEqual([
        '光が丘',
        '都庁前',
        '新宿(大江戸線)',
        '渋谷',
      ]);
    });

    it('長さが駅リストと合わなければ null を返す', () => {
      expect(
        alignConnectedTrainRouteSegments(['光が丘', '渋谷'], joined)
      ).toBeNull();
    });
  });
});
