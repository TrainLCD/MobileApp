import type { Station } from '~/@types/graphql';
import {
  alignConnectedTrainRouteSegments,
  buildRouteLegInputs,
  isJoinedLineGroupStations,
} from './currentLineGroupStations';
import { concatLegStations } from './routeSearch';

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

  // 北斗(函館本線・室蘭本線)から東室蘭ですずらん(室蘭本線)に乗り換える。
  // 東室蘭は前後の区間で同じ駅なので、concatLegStations は北斗の駅として 1 回だけ並べる
  const HAKODATE = 11101;
  const MURORAN = 11104;
  const HOKUTO = 133;
  const SUZURAN = 134;
  const shinHakodateHokuto = stationOn(1110106, HAKODATE, HOKUTO);
  const higashiMuroranHokuto = stationOn(1110420, MURORAN, HOKUTO);
  const higashiMuroranSuzuran = stationOn(1110420, MURORAN, SUZURAN);
  const wanishi = stationOn(1110419, MURORAN, SUZURAN);
  const bokoi = stationOn(1110417, MURORAN, SUZURAN);
  const sameStationTransfer = concatLegStations([
    [shinHakodateHokuto, higashiMuroranHokuto],
    [higashiMuroranSuzuran, wanishi, bokoi],
  ]);

  describe('buildRouteLegInputs', () => {
    it('乗換駅が前後の路線の駅として 2 回並ぶときは、それぞれの路線の駅を渡す', () => {
      // 新宿は大江戸線の駅と埼京線の駅の 2 回並ぶ(駅グループは同じ)
      const shinjukuOedo = {
        id: 9930128,
        groupId: 1130208,
        line: { id: OEDO },
        trainType: { groupId: 1000099301 },
      } as unknown as Station;
      const shinjukuSaikyo = {
        ...shinjuku,
        groupId: 1130208,
      } as unknown as Station;
      expect(
        buildRouteLegInputs([
          hikarigaoka,
          tochomae,
          shinjukuOedo,
          shinjukuSaikyo,
          shibuya,
        ])
      ).toEqual([
        {
          lineGroupId: 1000099301,
          fromStationId: 9930138,
          toStationId: 9930128,
        },
        { lineGroupId: 170, fromStationId: 1132104, toStationId: 1132103 },
      ]);
    });

    // 次の範囲の先頭(輪西)を渡すと、北斗の系統に無い駅を降車駅にしてしまい、
    // trainRoute がエラーを返してオートモードが発車しなかった
    it('乗換駅が前後の区間で同じ駅なら、その駅を降車駅と次の区間の乗車駅に渡す', () => {
      expect(sameStationTransfer.map((s) => s.id)).toEqual([
        1110106, 1110420, 1110419, 1110417,
      ]);
      expect(buildRouteLegInputs(sameStationTransfer)).toEqual([
        { lineGroupId: HOKUTO, fromStationId: 1110106, toStationId: 1110420 },
        { lineGroupId: SUZURAN, fromStationId: 1110420, toStationId: 1110417 },
      ]);
    });

    it('同じ駅での乗換の後に次の区間の通過駅が続いても、乗換駅を渡す', () => {
      // 輪西を通過する種別。通過駅は種別を持たないので、前の区間の範囲に入る
      const wanishiPassed = stationOn(1110419, MURORAN, null);
      const stations = concatLegStations([
        [shinHakodateHokuto, higashiMuroranHokuto],
        [higashiMuroranSuzuran, wanishiPassed, bokoi],
      ]);
      expect(buildRouteLegInputs(stations)).toEqual([
        { lineGroupId: HOKUTO, fromStationId: 1110106, toStationId: 1110420 },
        { lineGroupId: SUZURAN, fromStationId: 1110420, toStationId: 1110417 },
      ]);
    });

    // オートモードが終点で折り返したときなど、末尾から先頭へ進む場合
    it('末尾から進むときは区間を逆順にして乗車駅と降車駅を入れ替える', () => {
      expect(buildRouteLegInputs(sameStationTransfer, true)).toEqual([
        { lineGroupId: SUZURAN, fromStationId: 1110417, toStationId: 1110420 },
        { lineGroupId: HOKUTO, fromStationId: 1110420, toStationId: 1110106 },
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
