import type { Station } from '~/@types/graphql';
import type { SavedRouteLeg } from '~/models/SavedRoute';
import { concatLegStations, isTransferRouteTrainType } from './routeSearch';
import {
  buildSavedRouteLegs,
  buildSavedRouteStations,
  buildSavedTransferTrainType,
  isSameSavedRouteLegs,
  pickSavedRouteLegStations,
} from './transferRoutePreset';

// 光が丘から大江戸線で代々木へ行き、山手線に乗り換えて渋谷へ行く経路
const OEDO_LINE = 99301;
const YAMANOTE_LINE = 11302;
const OEDO_LOCAL = 900;
const YAMANOTE_LOCAL = 300;

const station = (
  id: number,
  groupId: number,
  lineId: number,
  lineGroupId: number | null
): Station =>
  ({
    id,
    groupId,
    name: `駅${id}`,
    line: { id: lineId, nameShort: `路線${lineId}` },
    trainType:
      lineGroupId == null
        ? null
        : {
            id: lineGroupId * 10,
            groupId: lineGroupId,
            typeId: 1,
            name: '各駅停車',
            nameRoman: 'Local',
            lines: [],
          },
  }) as unknown as Station;

const hikarigaoka = station(101, 1, OEDO_LINE, OEDO_LOCAL);
const nerima = station(102, 2, OEDO_LINE, OEDO_LOCAL);
const yoyogiOedo = station(103, 3, OEDO_LINE, OEDO_LOCAL);
const kokuritsuKyogijo = station(104, 4, OEDO_LINE, OEDO_LOCAL);
const shinjuku = station(201, 5, YAMANOTE_LINE, YAMANOTE_LOCAL);
const yoyogiYamanote = station(202, 3, YAMANOTE_LINE, YAMANOTE_LOCAL);
const harajuku = station(203, 6, YAMANOTE_LINE, YAMANOTE_LOCAL);
const shibuya = station(204, 7, YAMANOTE_LINE, YAMANOTE_LOCAL);
const ebisu = station(205, 8, YAMANOTE_LINE, YAMANOTE_LOCAL);

const oedoStations = [hikarigaoka, nerima, yoyogiOedo, kokuritsuKyogijo];
const yamanoteStations = [shinjuku, yoyogiYamanote, harajuku, shibuya, ebisu];

// 経路検索で組み立てた駅リスト(乗換駅の代々木は前後の路線の駅として 2 回並ぶ)
const routeStations = concatLegStations([
  [hikarigaoka, nerima, yoyogiOedo],
  [yoyogiYamanote, harajuku, shibuya],
]);

const expectedLegs: SavedRouteLeg[] = [
  {
    lineGroupId: OEDO_LOCAL,
    fromStationId: 101,
    toStationId: 103,
    stationGroupIds: [1, 2, 3],
  },
  {
    lineGroupId: YAMANOTE_LOCAL,
    fromStationId: 202,
    toStationId: 204,
    stationGroupIds: [3, 6, 7],
  },
];

const lookup =
  (map: Record<number, Station[]>) =>
  (lineGroupId: number): Station[] | undefined =>
    map[lineGroupId];

describe('buildSavedRouteLegs', () => {
  it('乗換経路の駅リストから区間ごとの系統・乗降駅・駅グループの並びを組み立てる', () => {
    expect(buildSavedRouteLegs(routeStations)).toEqual(expectedLegs);
  });

  it('乗換駅が前後の区間で同じ駅なら、次の区間の駅グループの並びもその駅から始める', () => {
    const HOKUTO = 133;
    const SUZURAN = 134;
    const shinHakodate = station(1110106, 10, 11101, HOKUTO);
    const higashiMuroran = station(1110420, 11, 11104, HOKUTO);
    const wanishi = station(1110419, 12, 11104, SUZURAN);
    const bokoi = station(1110417, 13, 11104, SUZURAN);

    expect(
      buildSavedRouteLegs([shinHakodate, higashiMuroran, wanishi, bokoi])
    ).toEqual([
      {
        lineGroupId: HOKUTO,
        fromStationId: 1110106,
        toStationId: 1110420,
        stationGroupIds: [10, 11],
      },
      {
        lineGroupId: SUZURAN,
        fromStationId: 1110420,
        toStationId: 1110417,
        stationGroupIds: [11, 12, 13],
      },
    ]);
  });

  it('1 系統だけの駅リストでは null を返す', () => {
    expect(buildSavedRouteLegs(oedoStations)).toBeNull();
  });
});

describe('buildSavedRouteStations', () => {
  it('保存した区間から、経路検索で選んだときと同じ駅リストを組み直す', () => {
    expect(
      buildSavedRouteStations(
        expectedLegs,
        lookup({
          [OEDO_LOCAL]: oedoStations,
          [YAMANOTE_LOCAL]: yamanoteStations,
        })
      )
    ).toEqual(routeStations);
  });

  it('乗換駅が前後の区間で同じ駅でも、保存した区間から同じ駅リストに戻る', () => {
    const HOKUTO = 133;
    const SUZURAN = 134;
    const shinHakodate = station(1110106, 10, 11101, HOKUTO);
    const higashiMuroranHokuto = station(1110420, 11, 11104, HOKUTO);
    const higashiMuroranSuzuran = station(1110420, 11, 11104, SUZURAN);
    const wanishi = station(1110419, 12, 11104, SUZURAN);
    const bokoi = station(1110417, 13, 11104, SUZURAN);
    const stations = concatLegStations([
      [shinHakodate, higashiMuroranHokuto],
      [higashiMuroranSuzuran, wanishi, bokoi],
    ]);
    const legs = buildSavedRouteLegs(stations);
    expect(legs).not.toBeNull();

    expect(
      buildSavedRouteStations(
        legs as SavedRouteLeg[],
        lookup({
          [HOKUTO]: [shinHakodate, higashiMuroranHokuto],
          [SUZURAN]: [higashiMuroranSuzuran, wanishi, bokoi],
        })
      )
    ).toEqual(stations);
  });

  it('系統の駅リストの並びが逆でも進行順に組み直す', () => {
    expect(
      buildSavedRouteStations(
        expectedLegs,
        lookup({
          [OEDO_LOCAL]: [...oedoStations].reverse(),
          [YAMANOTE_LOCAL]: [...yamanoteStations].reverse(),
        })
      )
    ).toEqual(routeStations);
  });

  it('駅グループの並びにある駅が系統の駅リストに無ければ、乗降駅から切り出す', () => {
    // プリセット一覧の一括取得は通過駅を返さない
    expect(
      buildSavedRouteStations(
        expectedLegs,
        lookup({
          [OEDO_LOCAL]: [hikarigaoka, yoyogiOedo, kokuritsuKyogijo],
          [YAMANOTE_LOCAL]: yamanoteStations,
        })
      )
    ).toEqual([hikarigaoka, yoyogiOedo, yoyogiYamanote, harajuku, shibuya]);
  });

  it('区間の系統の駅を引けなければ空配列を返す', () => {
    expect(
      buildSavedRouteStations(
        expectedLegs,
        lookup({ [OEDO_LOCAL]: oedoStations })
      )
    ).toEqual([]);
  });
});

describe('buildSavedTransferTrainType', () => {
  it('経路検索の乗換経路と同じく、最初の区間の種別を元にした負の id の種別を組み立てる', () => {
    const legStations = pickSavedRouteLegStations(
      expectedLegs,
      lookup({
        [OEDO_LOCAL]: oedoStations,
        [YAMANOTE_LOCAL]: yamanoteStations,
      })
    );
    expect(legStations).not.toBeNull();

    const trainType = buildSavedTransferTrainType(
      expectedLegs,
      legStations as Station[][]
    );

    expect(isTransferRouteTrainType(trainType)).toBe(true);
    expect(trainType?.groupId).toBe(OEDO_LOCAL);
    expect(trainType?.name).toBe('各駅停車');
    expect(trainType?.line?.id).toBe(YAMANOTE_LINE);
    expect(trainType?.lines?.map((l) => l.id)).toEqual([
      OEDO_LINE,
      YAMANOTE_LINE,
    ]);
  });

  it('区間の駅にその系統の種別が無ければ null を返す', () => {
    const passOnly = station(203, 6, YAMANOTE_LINE, null);
    expect(
      buildSavedTransferTrainType(expectedLegs, [
        [hikarigaoka, nerima, yoyogiOedo],
        [passOnly],
      ])
    ).toBeNull();
  });
});

describe('isSameSavedRouteLegs', () => {
  it('系統・乗降駅・駅グループの並びが同じなら同じ経路とみなす', () => {
    expect(
      isSameSavedRouteLegs(
        expectedLegs,
        expectedLegs.map((leg) => ({ ...leg }))
      )
    ).toBe(true);
  });

  it('系統と乗降駅が同じでも通る駅が違えば別の経路とみなす', () => {
    const otherArc = expectedLegs.map((leg, index) =>
      index === 1 ? { ...leg, stationGroupIds: [3, 5, 7] } : leg
    );
    expect(isSameSavedRouteLegs(expectedLegs, otherArc)).toBe(false);
  });

  it('区間の数が違えば別の経路とみなす', () => {
    expect(isSameSavedRouteLegs(expectedLegs, expectedLegs.slice(0, 1))).toBe(
      false
    );
  });
});
