import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import type React from 'react';
import type { Line, Station, TrainType } from '~/@types/graphql';
import {
  GET_CONNECTED_ROUTES,
  GET_LINE_GROUP_STATIONS,
  GET_LINE_STATIONS,
  GET_ROUTE_TYPES_LIGHT,
} from '~/lib/graphql/queries';
import { pendingLineAtom } from '~/store/atoms/line';
import {
  fetchedTrainTypesAtom,
  pendingTrainTypeAtom,
} from '~/store/atoms/navigation';
import {
  pendingStationAtom,
  pendingStationsAtom,
  stationAtom,
} from '~/store/atoms/station';
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

const idleQueryState = {
  data: undefined,
  loading: false,
  error: undefined,
  called: false,
};

describe('useDestinationSelection', () => {
  const mockUseLazyGraphQLQuery = useLazyGraphQLQuery as jest.MockedFunction<
    typeof useLazyGraphQLQuery
  >;
  const fetchRouteTypes = jest.fn();
  const fetchConnectedRoutes = jest.fn();
  const fetchStationsByLineId = jest.fn();
  const fetchStationsByLineGroupId = jest.fn();

  const firstLine = createLine(10);
  const secondLine = createLine(20);
  const currentStation = createStation(100, {
    groupId: 100,
    line: firstLine,
    lines: [firstLine, secondLine],
  });
  const destination = createStation(200, {
    groupId: 200,
    line: secondLine,
    lines: [secondLine],
  });

  const createTrainType = (
    id: number,
    groupId: number,
    line: Line,
    name = '普通'
  ) =>
    ({
      __typename: 'TrainType',
      id,
      groupId,
      name,
      nameRoman: 'Local',
      line,
      lines: [line],
    }) as TrainType;

  const createConnectedStops = (
    routeId: number,
    line: Line,
    offset: number
  ): Station[] => {
    const trainType = createTrainType(routeId, routeId, line);
    return [
      {
        ...createStation(100 + offset, {
          groupId: 100,
          line,
          lines: [line],
        }),
        trainType,
      } as Station,
      {
        ...createStation(200 + offset, {
          groupId: 200,
          line: secondLine,
          lines: [secondLine],
        }),
        trainType: createTrainType(routeId + 1, routeId, secondLine, '快速'),
      } as Station,
    ];
  };

  const setupLazyQueries = () => {
    mockUseLazyGraphQLQuery.mockImplementation((document) => {
      if (document === GET_ROUTE_TYPES_LIGHT) {
        return [fetchRouteTypes, idleQueryState];
      }
      if (document === GET_CONNECTED_ROUTES) {
        return [fetchConnectedRoutes, idleQueryState];
      }
      if (document === GET_LINE_STATIONS) {
        return [fetchStationsByLineId, idleQueryState];
      }
      if (document === GET_LINE_GROUP_STATIONS) {
        return [fetchStationsByLineGroupId, idleQueryState];
      }
      throw new Error('unknown query');
    });
  };

  const renderHook = () => {
    const store = createStore();
    store.set(stationAtom, currentStation);
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: Number.POSITIVE_INFINITY,
        },
      },
    });
    const hookRef: { current: HookResult } = { current: null };
    render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <HookBridge
            onReady={(value) => {
              hookRef.current = value;
            }}
          />
        </QueryClientProvider>
      </Provider>
    );
    return { hookRef, store };
  };

  beforeEach(() => {
    setupLazyQueries();
    fetchStationsByLineId.mockResolvedValue({
      data: { lineStations: [currentStation, destination] },
      error: undefined,
    });
    fetchStationsByLineGroupId.mockResolvedValue({
      data: { lineGroupStations: [currentStation, destination] },
      error: undefined,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('単一種別がある場合はConnectedRoutesを実行しない', async () => {
    const trainType = createTrainType(1, 1000, firstLine);
    fetchRouteTypes.mockResolvedValue({
      data: {
        routeTypes: { nextPageToken: null, trainTypes: [trainType] },
      },
      error: undefined,
    });
    const { hookRef } = renderHook();

    await act(async () => {
      await hookRef.current?.handleDestinationSelected(destination);
    });

    expect(fetchConnectedRoutes).not.toHaveBeenCalled();
    expect(fetchStationsByLineGroupId).toHaveBeenCalledWith({
      variables: { lineGroupId: 1000 },
    });
  });

  it('単一種別が空の場合は接続経路の駅列と仮想lineGroupIdを設定する', async () => {
    const stops = createConnectedStops(9000, firstLine, 0);
    fetchRouteTypes.mockResolvedValue({
      data: { routeTypes: { nextPageToken: null, trainTypes: [] } },
      error: undefined,
    });
    fetchConnectedRoutes.mockResolvedValue({
      data: { connectedRoutes: [{ id: 9000, stops }] },
      error: undefined,
    });
    const { hookRef, store } = renderHook();

    await act(async () => {
      await hookRef.current?.handleDestinationSelected(destination);
    });

    expect(store.get(pendingStationsAtom)).toEqual(stops);
    expect(store.get(pendingTrainTypeAtom)?.groupId).toBe(9000);
    expect(store.get(fetchedTrainTypesAtom)).toHaveLength(1);
    expect(store.get(pendingStationAtom)?.groupId).toBe(100);
  });

  it('ConnectedRoutesが空の場合は既存の路線フォールバックを維持する', async () => {
    fetchRouteTypes.mockResolvedValue({
      data: { routeTypes: { nextPageToken: null, trainTypes: [] } },
      error: undefined,
    });
    fetchConnectedRoutes.mockResolvedValue({
      data: { connectedRoutes: [] },
      error: undefined,
    });
    const { hookRef, store } = renderHook();

    await act(async () => {
      await hookRef.current?.handleDestinationSelected(destination);
    });

    expect(fetchStationsByLineId).toHaveBeenCalledWith({
      variables: { lineId: secondLine.id },
    });
    expect(store.get(pendingLineAtom)?.id).toBe(secondLine.id);
    expect(store.get(pendingStationsAtom)).toEqual([
      currentStation,
      destination,
    ]);
  });

  it('仮想候補への切替時は保持済み駅列を使う', async () => {
    const firstStops = createConnectedStops(9000, firstLine, 0);
    const secondStops = createConnectedStops(9001, secondLine, 10);
    fetchRouteTypes.mockResolvedValue({
      data: { routeTypes: { nextPageToken: null, trainTypes: [] } },
      error: undefined,
    });
    fetchConnectedRoutes.mockResolvedValue({
      data: {
        connectedRoutes: [
          { id: 9000, stops: firstStops },
          { id: 9001, stops: secondStops },
        ],
      },
      error: undefined,
    });
    const { hookRef, store } = renderHook();

    await act(async () => {
      await hookRef.current?.handleDestinationSelected(destination);
    });
    const secondCandidate = store
      .get(fetchedTrainTypesAtom)
      .find((trainType) => trainType.groupId === 9001);
    expect(secondCandidate).toBeDefined();

    await act(async () => {
      if (secondCandidate) {
        await hookRef.current?.handleTrainTypeSelected(secondCandidate);
      }
    });

    expect(store.get(pendingStationsAtom)).toEqual(secondStops);
    expect(fetchStationsByLineGroupId).not.toHaveBeenCalled();
  });

  it('単一種別取得の失敗時はConnectedRoutesへ進まない', async () => {
    fetchRouteTypes.mockResolvedValue({
      data: undefined,
      error: new Error('route types failed'),
    });
    const { hookRef } = renderHook();

    await act(async () => {
      await hookRef.current?.handleDestinationSelected(destination);
    });

    expect(fetchConnectedRoutes).not.toHaveBeenCalled();
    expect(fetchStationsByLineId).not.toHaveBeenCalled();
  });

  it('ConnectedRoutes取得の失敗時は路線フォールバックへ進まない', async () => {
    fetchRouteTypes.mockResolvedValue({
      data: { routeTypes: { nextPageToken: null, trainTypes: [] } },
      error: undefined,
    });
    fetchConnectedRoutes.mockResolvedValue({
      data: undefined,
      error: new Error('connected routes failed'),
    });
    const { hookRef } = renderHook();

    await act(async () => {
      await hookRef.current?.handleDestinationSelected(destination);
    });

    expect(fetchStationsByLineId).not.toHaveBeenCalled();
  });
});
