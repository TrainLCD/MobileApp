import type { Station } from '~/@types/graphql';
import {
  alignConnectedTrainRouteSegments,
  buildRouteLegInputs,
  isJoinedLineGroupStations,
} from './currentLineGroupStations';

const _station = (id: number, groupId: number | null): Station =>
  ({
    id,
    groupId: id,
    trainType: groupId == null ? null : { groupId },
  }) as unknown as Station;

describe('isJoinedLineGroupStations', () => {
  const station = (id: number, groupId: number | null): Station =>
    ({
      id,
      groupId: id,
      trainType: groupId == null ? null : { groupId },
    }) as unknown as Station;

  it('1 系統だけの駅リスト(通過駅を含む)は false', () => {
    expect(
      isJoinedLineGroupStations([
        station(1, 100),
        station(2, null),
        station(3, 100),
      ])
    ).toBe(false);
  });

  it('種別の無い駅リストは false', () => {
    expect(
      isJoinedLineGroupStations([station(1, null), station(2, null)])
    ).toBe(false);
  });

  it('複数の系統の範囲に分かれていれば true', () => {
    expect(isJoinedLineGroupStations([station(1, 100), station(2, 200)])).toBe(
      true
    );
  });
});

describe('乗換経路の区間指定', () => {
  const OEDO = 99301;
  const SAIKYO = 11321;
  // 乗換駅(新宿)は次の区間(埼京線)の駅として 1 度だけ持つ
  const stationOn = (
    id: number,
    lineId: number,
    groupId: number | null
  ): Station =>
    ({
      id,
      groupId: id,
      line: { id: lineId },
      trainType: groupId == null ? null : { groupId },
    }) as unknown as Station;
  const hikarigaoka = stationOn(9930138, OEDO, 1000099301);
  const tochomae = stationOn(9930100, OEDO, 1000099301);
  const shinjuku = stationOn(1132104, SAIKYO, 170);
  const shibuya = stationOn(1132103, SAIKYO, 170);
  const joined = [hikarigaoka, tochomae, shinjuku, shibuya];

  describe('buildRouteLegInputs', () => {
    // 前の区間の系統に無い乗換駅は、API が同じ駅グループの駅で引き当てる
    it('区間ごとの系統と乗降駅を並べ、前の区間の降車駅には乗換駅を渡す', () => {
      expect(buildRouteLegInputs(joined)).toEqual([
        {
          lineGroupId: 1000099301,
          fromStationId: 9930138,
          toStationId: 1132104,
        },
        { lineGroupId: 170, fromStationId: 1132104, toStationId: 1132103 },
      ]);
    });

    // オートモードが終点で折り返したときなど、末尾から先頭へ進む場合
    it('末尾から進むときは区間を逆順にして乗車駅と降車駅を入れ替える', () => {
      expect(buildRouteLegInputs(joined, true)).toEqual([
        { lineGroupId: 170, fromStationId: 1132103, toStationId: 1132104 },
        {
          lineGroupId: 1000099301,
          fromStationId: 1132104,
          toStationId: 9930138,
        },
      ]);
    });

    it('1 系統だけの駅リストでは null を返す', () => {
      expect(buildRouteLegInputs([hikarigaoka, tochomae])).toBeNull();
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

    it('末尾から進むときも次の区間の乗車駅の分を捨てて進行順に揃える', () => {
      // API: [渋谷, 新宿(埼京線)] + [新宿(大江戸線), 都庁前, 光が丘]
      const segments = [
        '渋谷',
        '新宿(埼京線)',
        '新宿(大江戸線)',
        '都庁前',
        '光が丘',
      ];

      expect(alignConnectedTrainRouteSegments(segments, joined, true)).toEqual([
        '渋谷',
        '新宿(埼京線)',
        '都庁前',
        '光が丘',
      ]);
    });

    it('長さが駅リストと合わなければ null を返す', () => {
      expect(
        alignConnectedTrainRouteSegments(['光が丘', '渋谷'], joined)
      ).toBeNull();
    });
  });
});
