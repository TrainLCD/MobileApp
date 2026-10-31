import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import type React from 'react';
import { StopCondition } from '~/@types/graphql';
import { gqlRequest } from '~/lib/gql';
import {
  GET_LINE_LIST_STATIONS,
  GET_LINE_STATIONS,
  GET_STATION_TRAIN_TYPES_LIGHT,
} from '~/lib/graphql/queries';
import { selectedLineAtom } from '~/store/atoms/line';
import {
  selectedBoundAtom,
  selectedDirectionAtom,
  stationAtom,
  stationsAtom,
} from '~/store/atoms/station';
import { createLine, createStation } from '~/utils/test/factories';
import { useCurrentLine } from './useCurrentLine';
import { useManualCurrentStation } from './useManualCurrentStation';

jest.mock('~/lib/gql', () => ({
  gqlRequest: jest.fn(),
  graphqlQueryKey: (document: unknown, variables: unknown) => [
    jest.requireActual('graphql').print(document),
    variables,
  ],
}));

afterEach(() => jest.clearAllMocks());

it('渋谷で東横線の種別を選んでも副都心線・西武・東武・みなとみらい線の全駅を取得して選べる', async () => {
  // IDはテスト用。現在系統にはない分岐先と、同一駅グループの別路線を再現する。
  const fukutoshin = createLine(1, { nameShort: '副都心線' });
  const toyoko = createLine(2, { nameShort: '東横線' });
  const minatomirai = createLine(3, { nameShort: 'みなとみらい線' });
  const seibuIkebukuro = createLine(4, { nameShort: '西武池袋線' });
  const seibuYurakucho = createLine(5, { nameShort: '西武有楽町線' });
  const seibuSayama = createLine(6, { nameShort: '西武狭山線' });
  const tobu = createLine(7, { nameShort: '東武東上線' });
  const fukutoshinShibuya = createStation(101, {
    name: '渋谷',
    groupId: 100,
    line: { ...fukutoshin, __typename: 'LineNested' },
  });
  const toyokoShibuya = createStation(201, {
    name: '渋谷',
    groupId: 100,
    line: { ...toyoko, __typename: 'LineNested' },
  });
  const passedStation = createStation(202, {
    line: { ...toyoko, __typename: 'LineNested' },
    stopCondition: StopCondition.Not,
  });
  const outsideStations = [
    fukutoshin,
    minatomirai,
    seibuIkebukuro,
    seibuYurakucho,
    seibuSayama,
    tobu,
  ].map((line) =>
    createStation((line.id ?? 0) * 100 + 9, {
      line: { ...line, __typename: 'LineNested' },
    })
  );
  const allStations = [
    fukutoshinShibuya,
    toyokoShibuya,
    { ...passedStation, stopCondition: StopCondition.All },
    ...outsideStations,
  ];
  const store = createStore();
  store.set(selectedLineAtom, toyoko);
  const route = [fukutoshinShibuya, toyokoShibuya, passedStation];
  store.set(stationsAtom, route);
  store.set(stationAtom, toyokoShibuya);
  store.set(selectedBoundAtom, passedStation);
  store.set(selectedDirectionAtom, 'INBOUND');
  (gqlRequest as jest.Mock).mockImplementation(async (document, variables) => {
    if (document === GET_STATION_TRAIN_TYPES_LIGHT) {
      return {
        stationTrainTypes: [
          {
            lines: [
              seibuIkebukuro,
              seibuYurakucho,
              fukutoshin,
              toyoko,
              minatomirai,
            ],
          },
          { lines: [tobu, fukutoshin, toyoko, minatomirai] },
          {
            lines: [
              seibuSayama,
              seibuIkebukuro,
              seibuYurakucho,
              fukutoshin,
              toyoko,
              minatomirai,
            ],
          },
        ],
      };
    }
    if (document === GET_LINE_LIST_STATIONS) {
      return {
        lineListStations: allStations.filter((s) =>
          variables.lineIds.includes(s.line?.id)
        ),
      };
    }
    // 旧APIは代表系統に絞られる。元の呼び出しへ戻すと全駅の検証が失敗する。
    if (document === GET_LINE_STATIONS) return { lineStations: route };
    throw new Error('Unexpected query');
  });
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Number.POSITIVE_INFINITY },
    },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>
      <Provider store={store}>{children}</Provider>
    </QueryClientProvider>
  );
  const { result, unmount } = renderHook(
    () => ({ ...useManualCurrentStation(), currentLine: useCurrentLine() }),
    { wrapper }
  );
  await waitFor(() =>
    expect(result.current.selectableStations).toHaveLength(allStations.length)
  );
  expect(gqlRequest).toHaveBeenCalledWith(GET_STATION_TRAIN_TYPES_LIGHT, {
    stationId: toyokoShibuya.id,
  });
  expect(gqlRequest).toHaveBeenCalledWith(GET_LINE_LIST_STATIONS, {
    lineIds: [1, 2, 4, 5, 3, 7, 6],
  });
  expect(result.current.selectableStations).toContain(fukutoshinShibuya);
  expect(result.current.selectableStations).toContain(toyokoShibuya);
  expect(result.current.selectableStations).toContain(passedStation);
  for (const station of outsideStations) {
    expect(result.current.selectableStations).toContain(station);
    act(() => result.current.selectStation(station));
    expect(store.get(stationAtom)).toBe(station);
    expect(result.current.currentLine?.id).toBe(station.line?.id);
    expect(store.get(stationsAtom)).toBe(route);
    expect(store.get(selectedBoundAtom)).toBe(passedStation);
    await waitFor(() =>
      expect(result.current.selectableStations).toHaveLength(allStations.length)
    );
  }
  act(() => store.set(selectedLineAtom, null));
  expect(result.current.selectableStations).toEqual([]);
  unmount();
  client.clear();
});
