import type { Station } from '~/@types/graphql';
import { getPresetRouteEndpoints } from './presetRouteEndpoints';

const createStation = (groupId: number): Station =>
  ({ id: groupId, groupId, name: `駅${groupId}` }) as Station;

const stations = [1, 2, 3, 4].map(createStation);

describe('getPresetRouteEndpoints', () => {
  it('行き先未指定なら両端の駅を返す', () => {
    const { from, to } = getPresetRouteEndpoints({
      stations,
      wantedDestinationId: null,
      direction: null,
    });
    expect(from?.groupId).toBe(1);
    expect(to?.groupId).toBe(4);
  });

  it('INBOUNDでは始発が先頭駅、終着が指定の行き先になる', () => {
    const { from, to } = getPresetRouteEndpoints({
      stations,
      wantedDestinationId: 3,
      direction: 'INBOUND',
    });
    expect(from?.groupId).toBe(1);
    expect(to?.groupId).toBe(3);
  });

  it('OUTBOUNDでは始発が末尾駅、終着が指定の行き先になる', () => {
    const { from, to } = getPresetRouteEndpoints({
      stations,
      wantedDestinationId: 2,
      direction: 'OUTBOUND',
    });
    expect(from?.groupId).toBe(4);
    expect(to?.groupId).toBe(2);
  });

  it('directionが無い行き先指定は両端の駅にフォールバックする', () => {
    const { from, to } = getPresetRouteEndpoints({
      stations,
      wantedDestinationId: 3,
      direction: null,
    });
    expect(from?.groupId).toBe(1);
    expect(to?.groupId).toBe(4);
  });

  it('行き先が駅一覧に無い場合は両端の駅にフォールバックする', () => {
    const { from, to } = getPresetRouteEndpoints({
      stations,
      wantedDestinationId: 999,
      direction: 'INBOUND',
    });
    expect(from?.groupId).toBe(1);
    expect(to?.groupId).toBe(4);
  });

  it('駅が無い場合はundefinedを返す', () => {
    const { from, to } = getPresetRouteEndpoints({
      stations: [],
      wantedDestinationId: 3,
      direction: 'INBOUND',
    });
    expect(from).toBeUndefined();
    expect(to).toBeUndefined();
  });
});
