import type { Station } from '~/@types/graphql';
import {
  getPresetOriginStation,
  getPresetRouteEndpoints,
} from './presetRouteEndpoints';

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

  // 保存時と表示時で駅一覧の取得クエリが異なり、並びが反転して返ることがある。
  // その場合でも始発駅が行き先と同じ駅にならないことを担保する
  it('並びが反転していてもINBOUNDの始発が行き先と重ならない', () => {
    const { from, to } = getPresetRouteEndpoints({
      stations,
      wantedDestinationId: 1,
      direction: 'INBOUND',
    });
    expect(from?.groupId).toBe(4);
    expect(to?.groupId).toBe(1);
  });

  it('並びが反転していてもOUTBOUNDの始発が行き先と重ならない', () => {
    const { from, to } = getPresetRouteEndpoints({
      stations,
      wantedDestinationId: 4,
      direction: 'OUTBOUND',
    });
    expect(from?.groupId).toBe(1);
    expect(to?.groupId).toBe(4);
  });

  it('駅が1駅しか無い場合は倒す先が無いのでその駅を返す', () => {
    const { from, to } = getPresetRouteEndpoints({
      stations: [createStation(1)],
      wantedDestinationId: 1,
      direction: 'INBOUND',
    });
    expect(from?.groupId).toBe(1);
    expect(to?.groupId).toBe(1);
  });
});

describe('getPresetOriginStation', () => {
  it('directionが無い場合はundefinedを返す', () => {
    expect(
      getPresetOriginStation({
        stations,
        wantedDestinationId: 3,
        direction: null,
      })
    ).toBeUndefined();
  });

  it('行き先が未指定ならdirectionの示す終端を返す', () => {
    expect(
      getPresetOriginStation({
        stations,
        wantedDestinationId: null,
        direction: 'OUTBOUND',
      })?.groupId
    ).toBe(4);
  });

  it('行き先が途中駅ならdirectionの示す終端をそのまま返す', () => {
    expect(
      getPresetOriginStation({
        stations,
        wantedDestinationId: 3,
        direction: 'OUTBOUND',
      })?.groupId
    ).toBe(4);
  });

  it('directionの示す終端が行き先と同じなら反対側の終端を返す', () => {
    expect(
      getPresetOriginStation({
        stations,
        wantedDestinationId: 4,
        direction: 'OUTBOUND',
      })?.groupId
    ).toBe(1);
  });
});
