import { getBusRouteLabel, groupBusLinesByRoute } from './groupBusLinesByRoute';
import { createCompany, createLine } from './test/factories';

const first = createLine(1, {
  company: createCompany(1),
  nameShort: '47A 新前橋駅西口線',
});
const second = createLine(2, {
  company: createCompany(1),
  nameShort: '47B 新前橋駅西口線',
});

it('のりばなしでも同一事業者・路線名で集約し、入力順と系統を保つ', () => {
  const groups = groupBusLinesByRoute([first, second]);
  expect(groups).toHaveLength(1);
  expect(groups[0].name).toBe('新前橋駅西口線');
  expect(groups[0].lines).toEqual([first, second]);
});
it('同名でも事業者が違う場合や不明な場合は統合しない', () => {
  expect(
    groupBusLinesByRoute([first, { ...second, company: createCompany(2) }])
  ).toHaveLength(2);
  expect(
    groupBusLinesByRoute([
      { ...first, company: null },
      { ...second, company: null },
    ])
  ).toHaveLength(2);
});
it('路線名が違えば分け、数字を含む通常の路線名は切り取らない', () => {
  expect(
    groupBusLinesByRoute([first, { ...second, nameShort: '22B 前橋渋川線' }])
  ).toHaveLength(2);
  expect(getBusRouteLabel({ ...first, nameShort: '名駅２４' }).name).toBe(
    '名駅２４'
  );
  expect(getBusRouteLabel({ ...first, nameShort: '新宿駅 西口線' }).name).toBe(
    '新宿駅 西口線'
  );
  expect(groupBusLinesByRoute([])).toEqual([]);
});

it('複数系統を先に並べ、グループ・単独系統・グループ内の順序を保つ', () => {
  const soloFirst = createLine(3, {
    company: createCompany(1),
    nameShort: '55C 前橋公園線',
  });
  const soloSecond = createLine(4, {
    company: createCompany(1),
    nameShort: '40B 東大室線',
  });
  const otherFirst = createLine(5, {
    company: createCompany(1),
    nameShort: '22B 前橋渋川線',
  });
  const otherSecond = createLine(6, {
    company: createCompany(1),
    nameShort: '22K 前橋渋川線',
  });
  const input = Object.freeze([
    soloFirst,
    first,
    soloSecond,
    otherFirst,
    otherSecond,
    second,
  ]);
  const groups = groupBusLinesByRoute(input);
  expect(groups.map(({ lines }) => lines.map(({ id }) => id))).toEqual([
    [1, 2],
    [5, 6],
    [3],
    [4],
  ]);
  expect(input.map(({ id }) => id)).toEqual([3, 1, 4, 5, 6, 2]);
});
