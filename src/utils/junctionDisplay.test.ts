import { createStation } from '~/utils/test/factories';
import { buildJunctionDisplays } from './junctionDisplay';

const before = createStation(1, { groupId: 10, line: { id: 100 } });
const after = createStation(2, { groupId: 10, line: { id: 200 } });

it('keeps both memberships in travel order without mutating the route', () => {
  const route = [before, after];
  expect(buildJunctionDisplays(route, false).get(before)).toEqual([
    before,
    after,
  ]);
  expect(buildJunctionDisplays(route, true).get(after)).toEqual([
    after,
    before,
  ]);
  expect(route).toEqual([before, after]);
});
it('does not split ordinary stations, repeated visits or duplicates on the same line', () => {
  expect(
    buildJunctionDisplays([before, createStation(3), after], false).size
  ).toBe(0);
  expect(
    buildJunctionDisplays([before, { ...before, id: 4 }], false).size
  ).toBe(0);
});
it('ignores missing stations and route memberships', () => {
  expect(
    buildJunctionDisplays([null, before, undefined, after], false).get(before)
  ).toEqual([before, after]);
  expect(
    buildJunctionDisplays([before, { ...after, line: null }], false).size
  ).toBe(0);
});
