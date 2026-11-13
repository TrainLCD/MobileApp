import { groupBusLinesByPlatform } from './groupBusLinesByPlatform';
import { createLine, createStation } from './test/factories';

const line = (id: number, platformCode: string | null, groupId = 1) =>
  createLine(id, {
    station: {
      ...createStation(id, { platformCode, groupId }),
      __typename: 'StationNested',
    },
  });

describe('groupBusLinesByPlatform', () => {
  it('全系統で情報がないときは従来表示にフォールバックする', () => {
    expect(groupBusLinesByPlatform([])).toBeNull();
    expect(groupBusLinesByPlatform([line(1, null), line(2, ' ')])).toBeNull();
    expect(
      groupBusLinesByPlatform([createLine(1, { station: null })])
    ).toBeNull();
  });

  it('のりばごとにまとめ、各系統と掲載順を保ち、情報なしを最後に置く', () => {
    const lines = [line(1, null), line(2, '4'), line(3, '2'), line(4, ' 4 ')];
    const groups = groupBusLinesByPlatform(lines);
    expect(groups?.map((g) => g.platformCode)).toEqual(['4', '2', null]);
    expect(groups?.map((g) => g.lines.map((l) => l.id))).toEqual([
      [2, 4],
      [3],
      [1],
    ]);
    expect(groups?.[0].lines[0]).toBe(lines[1]);
  });

  it('別の停留所に同じのりば番号があっても統合しない', () => {
    expect(
      groupBusLinesByPlatform([line(1, '4', 1), line(2, '4', 2)])
    ).toHaveLength(2);
  });

  it('数字以外ののりばも欠落させない', () => {
    expect(
      groupBusLinesByPlatform([line(1, 'A'), line(2, '北口')])?.map(
        (g) => g.platformCode
      )
    ).toEqual(['A', '北口']);
  });

  it('groupId がない同名・同番号の別停留所は ID で分ける', () => {
    const lines = [1, 2, 1].map((stationId, index) =>
      createLine(index + 1, {
        station: {
          ...createStation(stationId, {
            groupId: null,
            name: '中央駅',
            platformCode: '1',
          }),
          __typename: 'StationNested',
        },
      })
    );
    expect(
      groupBusLinesByPlatform(lines)?.map((group) =>
        group.lines.map((l) => l.id)
      )
    ).toEqual([[1, 3], [2]]);
  });

  it('groupId と停留所 ID が同じ数値でも別グループにする', () => {
    const withoutGroup = createLine(3, {
      station: {
        ...createStation(1, { groupId: null, platformCode: '4' }),
        __typename: 'StationNested',
      },
    });
    expect(
      groupBusLinesByPlatform([line(2, '4', 1), withoutGroup])
    ).toHaveLength(2);
  });
});
