import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import type React from 'react';
import type { Station, TrainType } from '~/@types/graphql';
import {
  GET_CONNECTED_ROUTES,
  GET_LINE_GROUP_STATIONS,
} from '~/lib/graphql/queries';
import { pendingLineAtom } from '~/store/atoms/line';
import { pendingTrainTypeAtom } from '~/store/atoms/navigation';
import { pendingStationsAtom, stationAtom } from '~/store/atoms/station';
import { createLine, createStation } from '~/utils/test/factories';
import { useDestinationSelection } from './useDestinationSelection';
import { useLazyGraphQLQuery } from './useLazyGraphQLQuery';

jest.mock('./useLazyGraphQLQuery', () => ({
  useLazyGraphQLQuery: jest.fn(),
}));

type HookResult = ReturnType<typeof useDestinationSelection> | null;

const HookBridge: React.FC<{ onReady: (value: HookResult) => void }> = ({
  onReady,
}) => {
  onReady(useDestinationSelection());
  return null;
};

// 光が丘 →(大江戸線)→ 新宿 →(埼京線)→ 渋谷
const oedo = createLine(99301, { nameShort: '都営大江戸線' });
const saikyo = createLine(11321, { nameShort: '埼京線' });
const onLine = (
  line: typeof oedo,
  groupId: number,
  trainTypeGroupId: number,
  id: number
): Station =>
  createStation(id, {
    groupId,
    line: { id: line.id, nameShort: line.nameShort },
    lines: [line] as never,
    trainType: { groupId: trainTypeGroupId } as never,
  });
const hikarigaoka = onLine(oedo, 9930138, 1000099301, 9930138);
const nerima = onLine(oedo, 2200106, 1000099301, 9930135);
const shinjukuOedo = onLine(oedo, 1130208, 1000099301, 9930128);
const tochomae = onLine(oedo, 1130225, 1000099301, 9930100);
const ikebukuro = onLine(saikyo, 1130212, 170, 1132106);
const shinjukuSaikyo = onLine(saikyo, 1130208, 170, 1132104);
const shibuya = onLine(saikyo, 1130205, 170, 1132103);

const oedoLocal = {
  id: 1,
  groupId: 1000099301,
  name: '各駅停車',
  line: oedo,
  lines: [oedo],
} as unknown as TrainType;
const saikyoLocal = {
  id: 2,
  groupId: 170,
  name: '各駅停車',
  line: saikyo,
  lines: [saikyo],
} as unknown as TrainType;

const transferRoute = {
  legs: [
    {
      trainTypes: [oedoLocal],
      fromStation: hikarigaoka,
      toStation: shinjukuOedo,
    },
    {
      trainTypes: [saikyoLocal],
      fromStation: shinjukuSaikyo,
      toStation: shibuya,
    },
  ],
};

// 系統ごとの駅リスト(格納順)。大江戸線は光が丘が末尾に来る
const lineGroupStations: Record<number, Station[]> = {
  1000099301: [tochomae, shinjukuOedo, nerima, hikarigaoka],
  170: [ikebukuro, shinjukuSaikyo, shibuya],
};

describe('useDestinationSelection', () => {
  const mockUseLazyQuery = useLazyGraphQLQuery as unknown as jest.Mock;
  let fetchConnectedRoutes: jest.Mock;
  let fetchLineGroupStations: jest.Mock;

  const setup = (currentStation: Station) => {
    fetchConnectedRoutes = jest.fn().mockResolvedValue({
      data: { connectedRoutes: [transferRoute] },
    });
    fetchLineGroupStations = jest.fn(
      async ({ variables }: { variables: { lineGroupId: number } }) => ({
        data: { lineGroupStations: lineGroupStations[variables.lineGroupId] },
      })
    );
    mockUseLazyQuery.mockImplementation((document) => {
      if (document === GET_CONNECTED_ROUTES) {
        return [
          fetchConnectedRoutes,
          {
            data: { connectedRoutes: [transferRoute] },
            loading: false,
            error: undefined,
          },
        ];
      }
      if (document === GET_LINE_GROUP_STATIONS) {
        return [
          fetchLineGroupStations,
          { data: undefined, loading: false, error: undefined },
        ];
      }
      return [jest.fn(), { data: undefined, loading: false, error: undefined }];
    });

    const store = createStore();
    store.set(stationAtom, currentStation);
    const hookRef: { current: HookResult } = { current: null };
    render(
      <QueryClientProvider client={new QueryClient()}>
        <Provider store={store}>
          <HookBridge
            onReady={(value) => {
              hookRef.current = value;
            }}
          />
        </Provider>
      </QueryClientProvider>
    );
    return { store, hookRef };
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('乗換のある経路は区間ごとの駅をつないで 1 本の駅リストにする', async () => {
    const { store, hookRef } = setup(hikarigaoka);

    await act(async () => {
      await hookRef.current?.handleDestinationSelected(shibuya);
    });

    expect(fetchLineGroupStations).toHaveBeenCalledTimes(2);
    // 大江戸線は格納順の逆向きに切り出し、乗換駅(新宿)は埼京線の駅として 1 度だけ持つ
    expect(store.get(pendingStationsAtom).map((s) => s.id)).toEqual([
      hikarigaoka.id,
      nerima.id,
      shinjukuSaikyo.id,
      shibuya.id,
    ]);
    expect(store.get(pendingTrainTypeAtom)?.id).toBe(-1);
    expect(hookRef.current?.modalError).toBeNull();
  });

  it('区間の駅グループの並び(探索が選んだ弧)があれば、それに沿って駅を拾う', async () => {
    const { store, hookRef } = setup(hikarigaoka);
    // 大江戸線の区間は練馬を通らない並びにしておき、並びに沿って拾ったことを確かめる
    const routeWithPath = {
      legs: [
        {
          ...transferRoute.legs[0],
          stationGroupIds: [hikarigaoka.groupId, shinjukuOedo.groupId],
        },
        {
          ...transferRoute.legs[1],
          stationGroupIds: [shinjukuSaikyo.groupId, shibuya.groupId],
        },
      ],
    };
    fetchConnectedRoutes.mockResolvedValue({
      data: { connectedRoutes: [routeWithPath] },
    });

    await act(async () => {
      await hookRef.current?.handleDestinationSelected(shibuya);
    });

    expect(store.get(pendingStationsAtom).map((s) => s.id)).toEqual([
      hikarigaoka.id,
      shinjukuSaikyo.id,
      shibuya.id,
    ]);
  });

  // 区間ごとの取得は並行に投げるので、最後に投げた取得以外の失敗は
  // useLazyGraphQLQuery の error に残らない
  it('区間の駅の取得に失敗したら駅リストを空にしてエラーを返す', async () => {
    const { store, hookRef } = setup(hikarigaoka);
    const failure = new Error('network');
    fetchLineGroupStations.mockImplementation(
      async ({ variables }: { variables: { lineGroupId: number } }) =>
        variables.lineGroupId === 1000099301
          ? { data: undefined, error: failure }
          : { data: { lineGroupStations: lineGroupStations[170] } }
    );

    await act(async () => {
      await hookRef.current?.handleDestinationSelected(shibuya);
    });

    expect(store.get(pendingStationsAtom)).toEqual([]);
    expect(hookRef.current?.modalError).toBe(failure);
  });

  // 乗車駅が後の区間の路線も持つとき、路線の並び順で選ぶと後の区間の路線になりうる
  it('乗換のある経路では最初の区間の乗車駅の路線を乗車駅の路線にする', async () => {
    const boarding = createStation(hikarigaoka.id ?? 0, {
      groupId: hikarigaoka.groupId ?? 0,
      line: { id: saikyo.id },
      lines: [saikyo, oedo] as never,
    });
    const { store, hookRef } = setup(boarding);

    await act(async () => {
      await hookRef.current?.handleDestinationSelected(shibuya);
    });

    expect(store.get(pendingLineAtom)?.id).toBe(oedo.id);
  });
});
