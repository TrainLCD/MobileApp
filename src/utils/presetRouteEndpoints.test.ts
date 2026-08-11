import type { Station } from '~/@types/graphql';
import {
  getPresetOriginStation,
  getPresetRouteEndpoints,
  resolvePresetSaveRoute,
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

  // 直通運転を含む系統では、direction から求めた終端が乗車駅と大きく離れる。
  // 保存された乗車駅があればそれをそのまま始発駅として表示する
  it('originStationIdが保存されていればその駅を始発駅にする', () => {
    const { from, to } = getPresetRouteEndpoints({
      stations,
      wantedDestinationId: 4,
      originStationId: 2,
      direction: 'INBOUND',
    });
    expect(from?.groupId).toBe(2);
    expect(to?.groupId).toBe(4);
  });

  it('originStationIdが駅一覧に無ければdirectionの終端へフォールバックする', () => {
    const { from, to } = getPresetRouteEndpoints({
      stations,
      wantedDestinationId: 3,
      originStationId: 999,
      direction: 'INBOUND',
    });
    expect(from?.groupId).toBe(1);
    expect(to?.groupId).toBe(3);
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

describe('resolvePresetSaveRoute', () => {
  // 座標付きの駅一覧: 1(北)→4(南) の順に並ぶ
  const coordStations = [
    { groupId: 1, latitude: 35.75, longitude: 139.8 },
    { groupId: 2, latitude: 35.74, longitude: 139.79 },
    { groupId: 3, latitude: 35.72, longitude: 139.77 },
    { groupId: 4, latitude: 35.7, longitude: 139.75 },
  ].map(({ groupId, latitude, longitude }) => ({
    ...createStation(groupId),
    latitude,
    longitude,
  }));

  it('行き先が未指定なら解決しない', () => {
    const { originStation, direction } = resolvePresetSaveRoute({
      stations,
      wantedDestinationId: null,
      currentStation: stations[0],
    });
    expect(originStation).toBeUndefined();
    expect(direction).toBeNull();
  });

  it('行き先が駅一覧に無い場合は解決しない', () => {
    const { originStation, direction } = resolvePresetSaveRoute({
      stations,
      wantedDestinationId: 999,
      currentStation: stations[0],
    });
    expect(originStation).toBeUndefined();
    expect(direction).toBeNull();
  });

  it('駅が1駅しか無い場合は始発駅になり得る駅が無いので解決しない', () => {
    const { originStation, direction } = resolvePresetSaveRoute({
      stations: [createStation(1)],
      wantedDestinationId: 1,
      currentStation: createStation(1),
    });
    expect(originStation).toBeUndefined();
    expect(direction).toBeNull();
  });

  it('行き先が先頭駅なら始発駅は末尾側に定まるのでOUTBOUNDを返す', () => {
    expect(
      resolvePresetSaveRoute({
        stations,
        wantedDestinationId: 1,
        currentStation: stations[0],
      }).direction
    ).toBe('OUTBOUND');
  });

  it('行き先が末尾駅なら始発駅は先頭側に定まるのでINBOUNDを返す', () => {
    expect(
      resolvePresetSaveRoute({
        stations,
        wantedDestinationId: 4,
        currentStation: stations[3],
      }).direction
    ).toBe('INBOUND');
  });

  // 経路内の最寄駅をそのまま始発駅にする（終端に倒さない）
  it('現在駅が行き先より手前なら現在駅を始発駅にしてINBOUNDを返す', () => {
    const { originStation, direction } = resolvePresetSaveRoute({
      stations,
      wantedDestinationId: 3,
      currentStation: stations[1],
    });
    expect(originStation?.groupId).toBe(2);
    expect(direction).toBe('INBOUND');
  });

  it('現在駅が行き先より奥なら現在駅を始発駅にしてOUTBOUNDを返す', () => {
    const { originStation, direction } = resolvePresetSaveRoute({
      stations,
      wantedDestinationId: 2,
      currentStation: stations[3],
    });
    expect(originStation?.groupId).toBe(4);
    expect(direction).toBe('OUTBOUND');
  });

  it('現在駅が駅一覧に無い場合は座標最寄りの駅を始発駅にする', () => {
    // 駅3の近くにいるが駅一覧には含まれない駅
    const offRoute = {
      ...createStation(99),
      latitude: 35.7205,
      longitude: 139.7705,
    };
    const { originStation, direction } = resolvePresetSaveRoute({
      stations: coordStations,
      wantedDestinationId: 2,
      currentStation: offRoute,
    });
    expect(originStation?.groupId).toBe(3);
    expect(direction).toBe('OUTBOUND');
  });

  it('現在駅が行き先そのものでも座標最寄りの駅を始発駅にする', () => {
    const { originStation, direction } = resolvePresetSaveRoute({
      stations: coordStations,
      wantedDestinationId: 2,
      currentStation: coordStations[1],
    });
    expect(originStation?.groupId).toBe(1);
    expect(direction).toBe('INBOUND');
  });

  it('現在駅が無く座標も引けない場合は解決しない', () => {
    const { originStation, direction } = resolvePresetSaveRoute({
      stations,
      wantedDestinationId: 2,
      currentStation: null,
    });
    expect(originStation).toBeUndefined();
    expect(direction).toBeNull();
  });
});

// 報告された不具合の再現: 地下鉄赤塚から新宿三丁目行きのプリセットを作ると
// 直通先の終端(森林公園)が始発駅になってしまっていた
describe('直通系統での保存→表示', () => {
  const namedStation = (groupId: number, name: string): Station =>
    ({ id: groupId, groupId, name }) as Station;

  // 東武東上線からの直通を含む副都心線の系統
  const throughStations = [
    namedStation(1, '森林公園'),
    namedStation(2, '和光市'),
    namedStation(3, '地下鉄赤塚'),
    namedStation(4, '池袋'),
    namedStation(5, '新宿三丁目'),
    namedStation(6, '渋谷'),
  ];
  const chikatetsuAkatsuka = throughStations[2];
  const shinjukuSanchome = throughStations[4];

  it('乗車駅が始発駅として保存され、そのまま表示される', () => {
    const { originStation, direction } = resolvePresetSaveRoute({
      stations: throughStations,
      wantedDestinationId: shinjukuSanchome.groupId,
      currentStation: chikatetsuAkatsuka,
    });
    expect(originStation?.name).toBe('地下鉄赤塚');

    const { from, to } = getPresetRouteEndpoints({
      stations: throughStations,
      wantedDestinationId: shinjukuSanchome.groupId,
      originStationId: originStation?.groupId ?? null,
      direction,
    });
    expect(from?.name).toBe('地下鉄赤塚');
    expect(to?.name).toBe('新宿三丁目');
  });

  it('始発駅を持たない古いプリセットは従来どおり終端を表示する', () => {
    const { from, to } = getPresetRouteEndpoints({
      stations: throughStations,
      wantedDestinationId: shinjukuSanchome.groupId,
      originStationId: null,
      direction: 'INBOUND',
    });
    expect(from?.name).toBe('森林公園');
    expect(to?.name).toBe('新宿三丁目');
  });
});
