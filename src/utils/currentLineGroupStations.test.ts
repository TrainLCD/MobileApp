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
    const group = (groupId: number) =>
      ({ id: groupId, groupId }) as unknown as Station;
    const segment = (name: string, groupId: number) => ({
      name,
      station: { groupId },
    });
    const names = (segments: { name: string }[] | null) =>
      segments?.map((s) => s.name) ?? null;

    it('乗換駅で 2 回現れる分は、その駅に着くまでの分だけを残す', () => {
      // 光が丘・都庁前・新宿(大江戸線) + 新宿(埼京線)・渋谷。新宿は同じ駅グループ(3)
      const stations = [group(1), group(2), group(3), group(4)];
      expect(
        names(
          alignConnectedTrainRouteSegments(
            [
              segment('光が丘', 1),
              segment('都庁前', 2),
              segment('新宿(大江戸線)', 3),
              segment('新宿(埼京線)', 3),
              segment('渋谷', 4),
            ],
            stations
          )
        )
      ).toEqual(['光が丘', '都庁前', '新宿(大江戸線)', '渋谷']);
    });

    // 系統の中で路線が変わる駅(東海道・山陽新幹線の新大阪)は、系統の駅リストに 2 回並ぶ。
    // 乗換駅として次の区間の新大阪を渡すと API はそこまで切り出すので、区間の駅数から
    // 件数を推定すると 1 駅ずれ、シミュレーションが走行区間を作れず止まっていた
    it('系統の中で 2 回並ぶ駅と乗換駅が重なっても、駅グループで突き合わせて揃える', () => {
      // 京都・新大阪 + 新大阪・新神戸。新大阪(3)は API で 3 回現れる
      const stations = [group(1), group(2), group(3), group(4)];
      expect(
        names(
          alignConnectedTrainRouteSegments(
            [
              segment('東京', 1),
              segment('京都', 2),
              segment('新大阪(東海道)', 3),
              segment('新大阪(山陽、系統の中)', 3),
              segment('新大阪(山陽、次の区間)', 3),
              segment('新神戸', 4),
            ],
            stations
          )
        )
      ).toEqual(['東京', '京都', '新大阪(東海道)', '新神戸']);
    });

    it('駅リストと突き合わせられなければ null を返す', () => {
      const stations = [group(1), group(2), group(3)];
      // 途中の駅が欠けている
      expect(
        alignConnectedTrainRouteSegments(
          [segment('a', 1), segment('c', 3)],
          stations
        )
      ).toBeNull();
      // segments が余る
      expect(
        alignConnectedTrainRouteSegments(
          [segment('a', 1), segment('b', 2), segment('c', 3), segment('d', 4)],
          stations
        )
      ).toBeNull();
    });
  });
});
