import { useLazyQuery } from '@apollo/client/react';
import { act, render, waitFor } from '@testing-library/react-native';
import * as Linking from 'expo-linking';
import { useSetAtom } from 'jotai';
import type React from 'react';
import { StopCondition, type TrainType } from '~/@types/graphql';
import { resolveSidsFromShortId } from '~/lib/routeResolver';
import { createStation } from '~/utils/test/factories';
import type { LineDirection } from '../models/Bound';
import { navigationRef } from '../stacks/rootNavigation';
import type { LineState } from '../store/atoms/line';
import type { NavigationState } from '../store/atoms/navigation';
import type { StationState } from '../store/atoms/station';
import { useDeepLink } from './useDeepLink';

jest.mock('@apollo/client/react', () => ({
  useLazyQuery: jest.fn(),
}));
jest.mock('jotai', () => ({
  useSetAtom: jest.fn(),
  atom: jest.fn(),
}));
jest.mock('expo-linking', () => ({
  getInitialURL: jest.fn().mockResolvedValue(null),
  addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  parse: jest.fn(),
}));
jest.mock('../stacks/rootNavigation', () => ({
  navigationRef: {
    isReady: jest.fn().mockReturnValue(false),
    dispatch: jest.fn(),
  },
}));
jest.mock('~/lib/routeResolver', () => ({
  ROUTE_RESOLVER_ID_PATTERN: /^[A-Za-z0-9_-]{1,32}$/,
  ROUTE_RESOLVER_TIMEOUT_MS: 10_000,
  resolveSidsFromShortId: jest.fn(),
}));

type HookResult = ReturnType<typeof useDeepLink> | null;

const HookBridge: React.FC<{ onReady: (value: HookResult) => void }> = ({
  onReady,
}) => {
  onReady(useDeepLink());
  return null;
};

const createTrainType = (overrides: Partial<TrainType> = {}): TrainType =>
  ({
    __typename: 'TrainTypeNested',
    typeId: 'local',
    name: 'Local',
    nameRoman: 'Local',
    color: '#fff',
    ...overrides,
  }) as TrainType;

const createStationState = (
  overrides: Partial<StationState> = {}
): StationState => ({
  arrived: true,
  approaching: false,
  station: null,
  stations: [],
  stationsCache: [],
  pendingStation: null,
  pendingStations: [],
  selectedDirection: null,
  selectedBound: null,
  wantedDestination: null,
  ...overrides,
});

const createNavigationState = (
  overrides: Partial<NavigationState> = {}
): NavigationState => ({
  headerState: 'CURRENT',
  trainType: null,
  bottomState: 'LINE',
  leftStations: [],
  stationForHeader: null,
  enabledLanguages: [],
  fetchedTrainTypes: [],
  autoModeEnabled: false,
  isAppLatest: false,
  firstStop: true,
  presetsFetched: false,
  presetRoutes: [],
  pendingTrainType: null,
  pendingQuickActionRouteId: null,
  ...overrides,
});

const createLineState = (overrides: Partial<LineState> = {}): LineState => ({
  selectedLine: null,
  pendingLine: null,
  ...overrides,
});

describe('useDeepLink', () => {
  const mockUseLazyQuery = useLazyQuery as unknown as jest.Mock;
  const mockUseSetAtom = useSetAtom as jest.MockedFunction<typeof useSetAtom>;
  const mockGetInitialURL = Linking.getInitialURL as jest.Mock;
  const mockParse = Linking.parse as jest.Mock;
  const mockAddEventListener = Linking.addEventListener as jest.Mock;

  // Relies on useDeepLink calling useSetAtom in this exact order:
  // stationState, navigationState, lineState (matching the hook's declaration order).
  const setupAtoms = () => {
    const mockSetStationState = jest.fn();
    const mockSetNavigationState = jest.fn();
    const mockSetLineState = jest.fn();
    const setters = [
      mockSetStationState,
      mockSetNavigationState,
      mockSetLineState,
    ];
    let atomCallIdx = 0;
    mockUseSetAtom.mockImplementation(() => {
      const result = setters[atomCallIdx % 3];
      atomCallIdx++;
      return result;
    });
    return { mockSetStationState, mockSetNavigationState, mockSetLineState };
  };

  const setupQueries = ({
    groupLoading = false,
    lineLoading = false,
    idsLoading = false,
    groupError,
    lineError,
    idsError,
  }: {
    groupLoading?: boolean;
    lineLoading?: boolean;
    idsLoading?: boolean;
    groupError?: Error;
    lineError?: Error;
    idsError?: Error;
  } = {}) => {
    const mockFetchByGroup = jest.fn();
    const mockFetchByLine = jest.fn();
    const mockFetchByIds = jest.fn();
    const queryResults = [
      [mockFetchByGroup, { loading: groupLoading, error: groupError }],
      [mockFetchByLine, { loading: lineLoading, error: lineError }],
      [mockFetchByIds, { loading: idsLoading, error: idsError }],
    ];
    let queryCallIdx = 0;
    mockUseLazyQuery.mockImplementation(() => {
      const result = queryResults[queryCallIdx % queryResults.length];
      queryCallIdx++;
      return result;
    });
    return { mockFetchByGroup, mockFetchByLine, mockFetchByIds };
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('初回URLがある場合にstateを設定する', async () => {
    const stations = [
      createStation(1, {
        groupId: 1,
        line: { id: 999, nameShort: 'Yamanote' },
        trainType: createTrainType(),
      } as Parameters<typeof createStation>[1]),
      createStation(2, {
        groupId: 2,
        line: { id: 999, nameShort: 'Yamanote' },
      } as Parameters<typeof createStation>[1]),
    ];

    mockGetInitialURL.mockResolvedValue(
      'CanaryTrainLCD://?lid=999&sgid=1&dir=0'
    );
    mockParse.mockReturnValue({
      queryParams: { lid: '999', sgid: '1', dir: '0' },
    });

    const { mockSetStationState, mockSetNavigationState, mockSetLineState } =
      setupAtoms();
    const { mockFetchByLine } = setupQueries();
    mockFetchByLine.mockResolvedValue({
      data: { lineStations: stations },
    });

    const hookRef: { current: HookResult } = { current: null };
    render(
      <HookBridge
        onReady={(value) => {
          hookRef.current = value;
        }}
      />
    );

    await waitFor(() => {
      expect(mockFetchByLine).toHaveBeenCalled();
    });

    expect(mockFetchByLine).toHaveBeenCalledWith({
      variables: { lineId: 999 },
    });

    const stationSetter = mockSetStationState.mock.calls[0][0];
    const stationResult = stationSetter(createStationState());
    expect(stationResult.station?.groupId).toBe(1);
    expect(stationResult.stations).toEqual(stations);
    expect(stationResult.selectedDirection).toBe<LineDirection>('INBOUND');
    expect(stationResult.selectedBound?.groupId).toBe(2);
    expect(stationResult.pendingStation).toBeNull();
    expect(stationResult.pendingStations).toEqual([]);

    const navSetter = mockSetNavigationState.mock.calls[0][0];
    const navResult = navSetter(createNavigationState());
    expect(navResult.trainType?.typeId).toBe('local');
    expect(navResult.leftStations).toEqual([]);

    const lineSetter = mockSetLineState.mock.calls[0][0];
    const lineResult = lineSetter(createLineState());
    expect(lineResult.selectedLine?.id).toBe(999);
    expect(lineResult.pendingLine).toBeNull();
  });

  it('lgidが指定された場合はlineGroupStationsで取得する', async () => {
    const stations = [
      createStation(10, {
        groupId: 10,
        line: { id: 500, nameShort: 'Express' },
      } as Parameters<typeof createStation>[1]),
      createStation(20, {
        groupId: 20,
        line: { id: 500, nameShort: 'Express' },
      } as Parameters<typeof createStation>[1]),
    ];

    mockGetInitialURL.mockResolvedValue(
      'CanaryTrainLCD://?lid=500&lgid=50&sgid=20&dir=1'
    );
    mockParse.mockReturnValue({
      queryParams: { lid: '500', lgid: '50', sgid: '20', dir: '1' },
    });

    const { mockSetStationState } = setupAtoms();
    const { mockFetchByGroup } = setupQueries();
    mockFetchByGroup.mockResolvedValue({
      data: { lineGroupStations: stations },
    });

    render(
      <HookBridge
        onReady={() => {
          /* noop */
        }}
      />
    );

    await waitFor(() => {
      expect(mockFetchByGroup).toHaveBeenCalled();
    });

    expect(mockFetchByGroup).toHaveBeenCalledWith({
      variables: { lineGroupId: 50 },
    });

    const stationSetter = mockSetStationState.mock.calls[0][0];
    const result = stationSetter(createStationState());
    expect(result.selectedDirection).toBe<LineDirection>('OUTBOUND');
    expect(result.selectedBound?.groupId).toBe(10);
    expect(result.station?.groupId).toBe(20);
  });

  it('lidが欠落している場合はstateを変更しない', async () => {
    mockGetInitialURL.mockResolvedValue('CanaryTrainLCD://?sgid=1&dir=0');
    mockParse.mockReturnValue({
      queryParams: { sgid: '1', dir: '0' },
    });

    const { mockSetStationState, mockSetNavigationState, mockSetLineState } =
      setupAtoms();
    setupQueries();

    render(
      <HookBridge
        onReady={() => {
          /* noop */
        }}
      />
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockSetStationState).not.toHaveBeenCalled();
    expect(mockSetNavigationState).not.toHaveBeenCalled();
    expect(mockSetLineState).not.toHaveBeenCalled();
  });

  it('dirが不正な場合はstateを変更しない', async () => {
    mockGetInitialURL.mockResolvedValue(
      'CanaryTrainLCD://?lid=999&sgid=1&dir=2'
    );
    mockParse.mockReturnValue({
      queryParams: { lid: '999', sgid: '1', dir: '2' },
    });

    const { mockSetStationState } = setupAtoms();
    setupQueries();

    render(
      <HookBridge
        onReady={() => {
          /* noop */
        }}
      />
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockSetStationState).not.toHaveBeenCalled();
  });

  it.each([
    ['sgidが小数', { lid: '999', sgid: '1.5', dir: '0' }],
    ['sgidがInfinity', { lid: '999', sgid: 'Infinity', dir: '0' }],
    ['sgidが0', { lid: '999', sgid: '0', dir: '0' }],
    ['sgidに余分な文字', { lid: '999', sgid: '123x', dir: '0' }],
    ['lidが小数', { lid: '1.5', sgid: '1', dir: '0' }],
    ['lidが指数表記', { lid: '1e3', sgid: '1', dir: '0' }],
    ['lgidが小数', { lid: '999', sgid: '1', lgid: '1.5', dir: '0' }],
    ['lgidが不正値', { lid: '999', sgid: '1', lgid: 'abc', dir: '0' }],
  ])(
    'レガシー経路で%sの場合はstateを変更しない',
    async (_label, queryParams) => {
      mockGetInitialURL.mockResolvedValue('CanaryTrainLCD://?legacy');
      mockParse.mockReturnValue({ queryParams });

      const { mockSetStationState, mockSetNavigationState, mockSetLineState } =
        setupAtoms();
      const { mockFetchByLine, mockFetchByGroup } = setupQueries();

      render(
        <HookBridge
          onReady={() => {
            /* noop */
          }}
        />
      );

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockFetchByLine).not.toHaveBeenCalled();
      expect(mockFetchByGroup).not.toHaveBeenCalled();
      expect(mockSetStationState).not.toHaveBeenCalled();
      expect(mockSetNavigationState).not.toHaveBeenCalled();
      expect(mockSetLineState).not.toHaveBeenCalled();
    }
  );

  it('駅が見つからなければstateを変更しない', async () => {
    mockGetInitialURL.mockResolvedValue(
      'CanaryTrainLCD://?lid=999&sgid=99&dir=0'
    );
    mockParse.mockReturnValue({
      queryParams: { lid: '999', sgid: '99', dir: '0' },
    });

    const { mockSetStationState, mockSetNavigationState, mockSetLineState } =
      setupAtoms();
    const { mockFetchByLine } = setupQueries();
    mockFetchByLine.mockResolvedValue({ data: { lineStations: [] } });

    render(
      <HookBridge
        onReady={() => {
          /* noop */
        }}
      />
    );

    await waitFor(() => {
      expect(mockFetchByLine).toHaveBeenCalled();
    });

    expect(mockSetStationState).not.toHaveBeenCalled();
    expect(mockSetNavigationState).not.toHaveBeenCalled();
    expect(mockSetLineState).not.toHaveBeenCalled();
  });

  it('loading/errorフラグを集約する', () => {
    mockGetInitialURL.mockResolvedValue(null);

    setupAtoms();
    setupQueries({
      groupLoading: true,
      lineLoading: false,
      groupError: new Error('group'),
    });

    const hookRef: { current: HookResult } = { current: null };
    render(
      <HookBridge
        onReady={(value) => {
          hookRef.current = value;
        }}
      />
    );

    expect(hookRef.current?.isLoading).toBe(true);
    expect(hookRef.current?.error?.message).toBe('group');
  });

  it('URLイベントリスナーを登録する', () => {
    mockGetInitialURL.mockResolvedValue(null);

    setupAtoms();
    setupQueries();

    render(
      <HookBridge
        onReady={() => {
          /* noop */
        }}
      />
    );

    expect(mockAddEventListener).toHaveBeenCalledWith(
      'url',
      expect.any(Function)
    );
  });

  it('初回URL処理完了前はinitialUrlProcessedがfalse', () => {
    mockGetInitialURL.mockReturnValue(new Promise(() => {}));

    setupAtoms();
    setupQueries();

    const hookRef: { current: HookResult } = { current: null };
    render(
      <HookBridge
        onReady={(value) => {
          hookRef.current = value;
        }}
      />
    );

    expect(hookRef.current?.initialUrlProcessed).toBe(false);
  });

  it('初回URL処理完了後にinitialUrlProcessedがtrue', async () => {
    mockGetInitialURL.mockResolvedValue(null);

    setupAtoms();
    setupQueries();

    const hookRef: { current: HookResult } = { current: null };
    render(
      <HookBridge
        onReady={(value) => {
          hookRef.current = value;
        }}
      />
    );

    await waitFor(() => {
      expect(hookRef.current?.initialUrlProcessed).toBe(true);
    });
  });

  it('handleUrl例外時でもinitialUrlProcessedがtrueになる', async () => {
    mockGetInitialURL.mockResolvedValue(
      'CanaryTrainLCD://?lid=999&sgid=1&dir=0'
    );
    mockParse.mockReturnValue({
      queryParams: { lid: '999', sgid: '1', dir: '0' },
    });

    setupAtoms();
    const { mockFetchByLine } = setupQueries();
    mockFetchByLine.mockRejectedValue(new Error('network'));

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const hookRef: { current: HookResult } = { current: null };
    render(
      <HookBridge
        onReady={(value) => {
          hookRef.current = value;
        }}
      />
    );

    await waitFor(() => {
      expect(hookRef.current?.initialUrlProcessed).toBe(true);
    });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('failed to process initial URL'),
      expect.any(Error)
    );

    warnSpy.mockRestore();
  });

  it('ランタイムURLイベントのPromise拒否をキャッチする', async () => {
    mockGetInitialURL.mockResolvedValue(null);

    setupAtoms();
    const { mockFetchByLine } = setupQueries();
    mockFetchByLine.mockRejectedValue(new Error('network'));

    mockParse.mockReturnValue({
      queryParams: { lid: '999', sgid: '1', dir: '0' },
    });

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    render(
      <HookBridge
        onReady={() => {
          /* noop */
        }}
      />
    );

    // Fire the runtime URL event listener
    const listenerCallback = mockAddEventListener.mock.calls[0][1];
    await act(async () => {
      await listenerCallback({ url: 'CanaryTrainLCD://?lid=999&sgid=1&dir=0' });
    });

    await waitFor(() => {
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('failed to process runtime URL'),
        expect.any(Error)
      );
    });

    warnSpy.mockRestore();
  });

  it('ナビゲーターが準備済みの場合はMain画面へナビゲートする', async () => {
    const mockDispatch = navigationRef.dispatch as jest.Mock;
    const mockIsReady = navigationRef.isReady as jest.Mock;
    mockIsReady.mockReturnValue(true);

    const stations = [
      createStation(1, {
        groupId: 1,
        line: { id: 999, nameShort: 'Yamanote' },
        trainType: createTrainType(),
      } as Parameters<typeof createStation>[1]),
      createStation(2, {
        groupId: 2,
        line: { id: 999, nameShort: 'Yamanote' },
      } as Parameters<typeof createStation>[1]),
    ];

    mockGetInitialURL.mockResolvedValue(
      'CanaryTrainLCD://?lid=999&sgid=1&dir=0'
    );
    mockParse.mockReturnValue({
      queryParams: { lid: '999', sgid: '1', dir: '0' },
    });

    setupAtoms();
    const { mockFetchByLine } = setupQueries();
    mockFetchByLine.mockResolvedValue({
      data: { lineStations: stations },
    });

    render(
      <HookBridge
        onReady={() => {
          /* noop */
        }}
      />
    );

    await waitFor(() => {
      expect(mockFetchByLine).toHaveBeenCalled();
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'NAVIGATE',
        payload: { name: 'MainStack', params: { screen: 'Main' } },
      })
    );
  });

  it('ナビゲーターが未準備の場合はリトライ後にナビゲートしない', async () => {
    jest.useFakeTimers();

    const mockDispatch = navigationRef.dispatch as jest.Mock;
    const mockIsReady = navigationRef.isReady as jest.Mock;
    mockIsReady.mockReturnValue(false);

    const stations = [
      createStation(1, {
        groupId: 1,
        line: { id: 999, nameShort: 'Yamanote' },
        trainType: createTrainType(),
      } as Parameters<typeof createStation>[1]),
      createStation(2, {
        groupId: 2,
        line: { id: 999, nameShort: 'Yamanote' },
      } as Parameters<typeof createStation>[1]),
    ];

    mockGetInitialURL.mockResolvedValue(
      'CanaryTrainLCD://?lid=999&sgid=1&dir=0'
    );
    mockParse.mockReturnValue({
      queryParams: { lid: '999', sgid: '1', dir: '0' },
    });

    setupAtoms();
    const { mockFetchByLine } = setupQueries();
    mockFetchByLine.mockResolvedValue({
      data: { lineStations: stations },
    });

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    render(
      <HookBridge
        onReady={() => {
          /* noop */
        }}
      />
    );

    // Flush the async chain: getInitialURL → handleUrl → openLink → fetchByLine → navigateToMain → waitForNavReady
    await act(async () => {
      for (let i = 0; i < 10; i++) {
        await Promise.resolve();
      }
    });

    // Advance past all retry delays (100 + 200 + 400 + 800 = 1500ms)
    await act(async () => {
      jest.advanceTimersByTime(1500);
    });

    // Flush the promise resolution after retries exhaust
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockDispatch).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('not ready after retries')
    );

    warnSpy.mockRestore();
    jest.useRealTimers();
  });

  it('sidsが指定された場合はstations(ids)で取得し順序を保つ', async () => {
    // server returns stations in a different order than the requested ids
    const stationA = createStation(1131211, {
      groupId: 11312,
      line: { id: 11302, nameShort: 'Yamanote' },
      trainType: createTrainType(),
    } as Parameters<typeof createStation>[1]);
    const stationB = createStation(1131310, {
      groupId: 11313,
      line: { id: 11302, nameShort: 'Yamanote' },
    } as Parameters<typeof createStation>[1]);
    const stationC = createStation(2800217, {
      groupId: 28002,
      line: { id: 28005, nameShort: 'Marunouchi' },
    } as Parameters<typeof createStation>[1]);
    const stationD = createStation(2800218, {
      groupId: 28003,
      line: { id: 28005, nameShort: 'Marunouchi' },
    } as Parameters<typeof createStation>[1]);

    mockGetInitialURL.mockResolvedValue(
      'CanaryTrainLCD://route?sids=1131211,1131310,2800217,2800218&dir=0'
    );
    mockParse.mockReturnValue({
      queryParams: {
        sids: '1131211,1131310,2800217,2800218',
        dir: '0',
      },
    });

    const { mockSetStationState, mockSetNavigationState, mockSetLineState } =
      setupAtoms();
    const { mockFetchByIds, mockFetchByLine, mockFetchByGroup } =
      setupQueries();
    mockFetchByIds.mockResolvedValue({
      // intentionally reordered
      data: { stations: [stationD, stationB, stationC, stationA] },
    });

    render(
      <HookBridge
        onReady={() => {
          /* noop */
        }}
      />
    );

    await waitFor(() => {
      expect(mockFetchByIds).toHaveBeenCalled();
    });

    expect(mockFetchByIds).toHaveBeenCalledWith({
      variables: { ids: [1131211, 1131310, 2800217, 2800218] },
    });
    // legacy queries must not be called when sids takes the new path
    expect(mockFetchByLine).not.toHaveBeenCalled();
    expect(mockFetchByGroup).not.toHaveBeenCalled();

    const stationSetter = mockSetStationState.mock.calls[0][0];
    const stationResult = stationSetter(createStationState());
    expect(stationResult.stations.map((s: { id: number }) => s.id)).toEqual([
      1131211, 1131310, 2800217, 2800218,
    ]);
    expect(stationResult.station?.id).toBe(1131211);
    expect(stationResult.selectedDirection).toBe<LineDirection>('INBOUND');
    expect(stationResult.selectedBound?.id).toBe(2800218);

    const lineSetter = mockSetLineState.mock.calls[0][0];
    const lineResult = lineSetter(createLineState());
    expect(lineResult.selectedLine?.id).toBe(11302);

    const navSetter = mockSetNavigationState.mock.calls[0][0];
    const navResult = navSetter(createNavigationState());
    expect(navResult.trainType?.typeId).toBe('local');
    expect(navResult.autoModeEnabled).toBe(false);
  });

  it.each([
    ['dir=0', { sids: '1131211,1131310', dir: '0' }],
    ['dir=1', { sids: '1131211,1131310', dir: '1' }],
    ['dir=任意の値', { sids: '1131211,1131310', dir: '42' }],
    ['dir=非数値', { sids: '1131211,1131310', dir: 'abc' }],
  ])(
    'sidsで%sが渡されても無視されINBOUNDとして扱う',
    async (_label, queryParams) => {
      const stationA = createStation(1131211, {
        line: { id: 11302 },
      } as Parameters<typeof createStation>[1]);
      const stationB = createStation(1131310, {
        line: { id: 11302 },
      } as Parameters<typeof createStation>[1]);

      mockGetInitialURL.mockResolvedValue(
        `CanaryTrainLCD://route?sids=${queryParams.sids}&dir=${queryParams.dir}`
      );
      mockParse.mockReturnValue({ queryParams });

      const { mockSetStationState } = setupAtoms();
      const { mockFetchByIds } = setupQueries();
      mockFetchByIds.mockResolvedValue({
        data: { stations: [stationA, stationB] },
      });

      render(
        <HookBridge
          onReady={() => {
            /* noop */
          }}
        />
      );

      await waitFor(() => {
        expect(mockFetchByIds).toHaveBeenCalled();
      });

      const stationSetter = mockSetStationState.mock.calls[0][0];
      const stationResult = stationSetter(createStationState());
      expect(stationResult.selectedDirection).toBe<LineDirection>('INBOUND');
      expect(stationResult.selectedBound?.id).toBe(1131310);
    }
  );

  it('sidsが1件以下の場合はstateを変更しない', async () => {
    mockGetInitialURL.mockResolvedValue(
      'CanaryTrainLCD://route?sids=1131211&dir=0'
    );
    mockParse.mockReturnValue({
      queryParams: { sids: '1131211', dir: '0' },
    });

    const { mockSetStationState } = setupAtoms();
    const { mockFetchByIds } = setupQueries();

    render(
      <HookBridge
        onReady={() => {
          /* noop */
        }}
      />
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockFetchByIds).not.toHaveBeenCalled();
    expect(mockSetStationState).not.toHaveBeenCalled();
  });

  it('sidsでdirが省略された場合はINBOUNDとして扱う', async () => {
    const stationA = createStation(1131211, {
      line: { id: 11302 },
    } as Parameters<typeof createStation>[1]);
    const stationB = createStation(1131310, {
      line: { id: 11302 },
    } as Parameters<typeof createStation>[1]);

    mockGetInitialURL.mockResolvedValue(
      'CanaryTrainLCD://route?sids=1131211,1131310'
    );
    mockParse.mockReturnValue({
      queryParams: { sids: '1131211,1131310' },
    });

    const { mockSetStationState } = setupAtoms();
    const { mockFetchByIds } = setupQueries();
    mockFetchByIds.mockResolvedValue({
      data: { stations: [stationA, stationB] },
    });

    render(
      <HookBridge
        onReady={() => {
          /* noop */
        }}
      />
    );

    await waitFor(() => {
      expect(mockFetchByIds).toHaveBeenCalled();
    });

    const stationSetter = mockSetStationState.mock.calls[0][0];
    const stationResult = stationSetter(createStationState());
    expect(stationResult.selectedDirection).toBe<LineDirection>('INBOUND');
    expect(stationResult.selectedBound?.id).toBe(1131310);
  });

  it('sidsに不正なトークンが含まれる場合はstateを変更しない', async () => {
    mockGetInitialURL.mockResolvedValue(
      'CanaryTrainLCD://route?sids=1131211,123x,2800217&dir=0'
    );
    mockParse.mockReturnValue({
      queryParams: { sids: '1131211,123x,2800217', dir: '0' },
    });

    const { mockSetStationState } = setupAtoms();
    const { mockFetchByIds } = setupQueries();

    render(
      <HookBridge
        onReady={() => {
          /* noop */
        }}
      />
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockFetchByIds).not.toHaveBeenCalled();
    expect(mockSetStationState).not.toHaveBeenCalled();
  });

  it('sidsの解決結果が空の場合はstateを変更しない', async () => {
    mockGetInitialURL.mockResolvedValue(
      'CanaryTrainLCD://route?sids=1,2,3&dir=0'
    );
    mockParse.mockReturnValue({
      queryParams: { sids: '1,2,3', dir: '0' },
    });

    const { mockSetStationState } = setupAtoms();
    const { mockFetchByIds } = setupQueries();
    mockFetchByIds.mockResolvedValue({ data: { stations: [] } });

    render(
      <HookBridge
        onReady={() => {
          /* noop */
        }}
      />
    );

    await waitFor(() => {
      expect(mockFetchByIds).toHaveBeenCalled();
    });

    expect(mockSetStationState).not.toHaveBeenCalled();
  });

  it('sidsが指定されている場合はsgid/lid/lgid/dirを無視する', async () => {
    const stationA = createStation(1131211, {
      line: { id: 11302 },
    } as Parameters<typeof createStation>[1]);
    const stationB = createStation(1131310, {
      line: { id: 11302 },
    } as Parameters<typeof createStation>[1]);

    mockGetInitialURL.mockResolvedValue(
      'CanaryTrainLCD://route?sids=1131211,1131310&sgid=99&lid=999&lgid=42&dir=1'
    );
    mockParse.mockReturnValue({
      queryParams: {
        sids: '1131211,1131310',
        sgid: '99',
        lid: '999',
        lgid: '42',
        dir: '1',
      },
    });

    const { mockSetStationState } = setupAtoms();
    const { mockFetchByIds, mockFetchByLine, mockFetchByGroup } =
      setupQueries();
    mockFetchByIds.mockResolvedValue({
      data: { stations: [stationA, stationB] },
    });

    render(
      <HookBridge
        onReady={() => {
          /* noop */
        }}
      />
    );

    await waitFor(() => {
      expect(mockFetchByIds).toHaveBeenCalled();
    });

    expect(mockFetchByLine).not.toHaveBeenCalled();
    expect(mockFetchByGroup).not.toHaveBeenCalled();

    // dir=1 is ignored: direction stays INBOUND and selectedBound is the last
    // station, identical to the dir-omitted case.
    const stationSetter = mockSetStationState.mock.calls[0][0];
    const stationResult = stationSetter(createStationState());
    expect(stationResult.selectedDirection).toBe<LineDirection>('INBOUND');
    expect(stationResult.selectedBound?.id).toBe(1131310);
  });

  it('sidsにautoとthemeを併用できる', async () => {
    const stationA = createStation(1131211, {
      line: { id: 11302 },
    } as Parameters<typeof createStation>[1]);
    const stationB = createStation(1131310, {
      line: { id: 11302 },
    } as Parameters<typeof createStation>[1]);

    mockGetInitialURL.mockResolvedValue(
      'CanaryTrainLCD://route?sids=1131211,1131310&dir=0&auto=1&theme=AUTO'
    );
    mockParse.mockReturnValue({
      queryParams: {
        sids: '1131211,1131310',
        dir: '0',
        auto: '1',
        theme: 'AUTO',
      },
    });

    const mockSetThemePreference = jest.fn();
    const mockSetStationState = jest.fn();
    const mockSetNavigationState = jest.fn();
    const mockSetLineState = jest.fn();
    // matches the hook's useSetAtom call order:
    // stationState, navigationState, lineState, themePreferenceAtom
    const setters = [
      mockSetStationState,
      mockSetNavigationState,
      mockSetLineState,
      mockSetThemePreference,
    ];
    let atomCallIdx = 0;
    mockUseSetAtom.mockImplementation(() => {
      const result = setters[atomCallIdx % setters.length];
      atomCallIdx++;
      return result;
    });

    const { mockFetchByIds } = setupQueries();
    mockFetchByIds.mockResolvedValue({
      data: { stations: [stationA, stationB] },
    });

    render(
      <HookBridge
        onReady={() => {
          /* noop */
        }}
      />
    );

    await waitFor(() => {
      expect(mockFetchByIds).toHaveBeenCalled();
    });

    expect(mockSetThemePreference).toHaveBeenCalledWith('AUTO');
    const navSetter = mockSetNavigationState.mock.calls[0][0];
    const navResult = navSetter(createNavigationState());
    expect(navResult.autoModeEnabled).toBe(true);
  });

  describe('skips parameter', () => {
    const buildStations = () => [
      createStation(1131211, {
        line: { id: 11302 },
        stopCondition: StopCondition.All,
      } as Parameters<typeof createStation>[1]),
      createStation(1131310, {
        line: { id: 11302 },
        stopCondition: StopCondition.All,
      } as Parameters<typeof createStation>[1]),
      createStation(2800217, {
        line: { id: 11302 },
        stopCondition: StopCondition.All,
      } as Parameters<typeof createStation>[1]),
      createStation(2800218, {
        line: { id: 11302 },
        stopCondition: StopCondition.All,
      } as Parameters<typeof createStation>[1]),
    ];

    it('skipsで指定したインデックスのstopConditionをNotに上書きする', async () => {
      const stations = buildStations();

      mockGetInitialURL.mockResolvedValue(
        'CanaryTrainLCD://route?sids=1131211,1131310,2800217,2800218&skips=1,2'
      );
      mockParse.mockReturnValue({
        queryParams: {
          sids: '1131211,1131310,2800217,2800218',
          skips: '1,2',
        },
      });

      const { mockSetStationState } = setupAtoms();
      const { mockFetchByIds } = setupQueries();
      mockFetchByIds.mockResolvedValue({ data: { stations } });

      render(
        <HookBridge
          onReady={() => {
            /* noop */
          }}
        />
      );

      await waitFor(() => {
        expect(mockFetchByIds).toHaveBeenCalled();
      });

      const stationSetter = mockSetStationState.mock.calls[0][0];
      const stationResult = stationSetter(createStationState());
      const overridden = stationResult.stations.map(
        (s: { stopCondition: StopCondition | null | undefined }) =>
          s.stopCondition
      );
      expect(overridden).toEqual([
        StopCondition.All,
        StopCondition.Not,
        StopCondition.Not,
        StopCondition.All,
      ]);
    });

    it('skips省略時は全駅のstopConditionを変更しない', async () => {
      const stations = buildStations();

      mockGetInitialURL.mockResolvedValue(
        'CanaryTrainLCD://route?sids=1131211,1131310,2800217,2800218'
      );
      mockParse.mockReturnValue({
        queryParams: { sids: '1131211,1131310,2800217,2800218' },
      });

      const { mockSetStationState } = setupAtoms();
      const { mockFetchByIds } = setupQueries();
      mockFetchByIds.mockResolvedValue({ data: { stations } });

      render(
        <HookBridge
          onReady={() => {
            /* noop */
          }}
        />
      );

      await waitFor(() => {
        expect(mockFetchByIds).toHaveBeenCalled();
      });

      const stationSetter = mockSetStationState.mock.calls[0][0];
      const stationResult = stationSetter(createStationState());
      // factory default is StopCondition.All — no station should be overridden
      expect(
        stationResult.stations.every(
          (s: { stopCondition: StopCondition | null | undefined }) =>
            s.stopCondition === StopCondition.All
        )
      ).toBe(true);
    });

    it('skipsが空文字の場合は全駅停車として扱う', async () => {
      const stations = buildStations();

      mockGetInitialURL.mockResolvedValue(
        'CanaryTrainLCD://route?sids=1131211,1131310,2800217,2800218&skips='
      );
      mockParse.mockReturnValue({
        queryParams: {
          sids: '1131211,1131310,2800217,2800218',
          skips: '',
        },
      });

      const { mockSetStationState } = setupAtoms();
      const { mockFetchByIds } = setupQueries();
      mockFetchByIds.mockResolvedValue({ data: { stations } });

      render(
        <HookBridge
          onReady={() => {
            /* noop */
          }}
        />
      );

      await waitFor(() => {
        expect(mockFetchByIds).toHaveBeenCalled();
      });

      const stationSetter = mockSetStationState.mock.calls[0][0];
      const stationResult = stationSetter(createStationState());
      expect(
        stationResult.stations.every(
          (s: { stopCondition: StopCondition | null | undefined }) =>
            s.stopCondition === StopCondition.All
        )
      ).toBe(true);
    });

    it('skipsで先頭駅も通過扱いにできる', async () => {
      const stations = buildStations();

      mockGetInitialURL.mockResolvedValue(
        'CanaryTrainLCD://route?sids=1131211,1131310,2800217,2800218&skips=0'
      );
      mockParse.mockReturnValue({
        queryParams: {
          sids: '1131211,1131310,2800217,2800218',
          skips: '0',
        },
      });

      const { mockSetStationState } = setupAtoms();
      const { mockFetchByIds } = setupQueries();
      mockFetchByIds.mockResolvedValue({ data: { stations } });

      render(
        <HookBridge
          onReady={() => {
            /* noop */
          }}
        />
      );

      await waitFor(() => {
        expect(mockFetchByIds).toHaveBeenCalled();
      });

      const stationSetter = mockSetStationState.mock.calls[0][0];
      const stationResult = stationSetter(createStationState());
      expect(stationResult.stations[0].stopCondition).toBe(StopCondition.Not);
    });

    it('サーバが一部の駅を返さなくても残りの駅のskipインデックスはずれない', async () => {
      // server omits sids[1] (1131310) — fetched stations: [A, C, D]
      const stations = [
        createStation(1131211, {
          line: { id: 11302 },
          stopCondition: StopCondition.All,
        } as Parameters<typeof createStation>[1]),
        createStation(2800217, {
          line: { id: 11302 },
          stopCondition: StopCondition.All,
        } as Parameters<typeof createStation>[1]),
        createStation(2800218, {
          line: { id: 11302 },
          stopCondition: StopCondition.All,
        } as Parameters<typeof createStation>[1]),
      ];

      mockGetInitialURL.mockResolvedValue(
        'CanaryTrainLCD://route?sids=1131211,1131310,2800217,2800218&skips=2'
      );
      mockParse.mockReturnValue({
        queryParams: {
          sids: '1131211,1131310,2800217,2800218',
          skips: '2',
        },
      });

      const { mockSetStationState } = setupAtoms();
      const { mockFetchByIds } = setupQueries();
      mockFetchByIds.mockResolvedValue({ data: { stations } });

      render(
        <HookBridge
          onReady={() => {
            /* noop */
          }}
        />
      );

      await waitFor(() => {
        expect(mockFetchByIds).toHaveBeenCalled();
      });

      const stationSetter = mockSetStationState.mock.calls[0][0];
      const stationResult = stationSetter(createStationState());
      // skip index 2 in the requested sids points to id 2800217 — that station
      // (after filtering out missing 1131310) must still be the one marked Not.
      const byId = new Map(
        stationResult.stations.map(
          (s: {
            id: number;
            stopCondition: StopCondition | null | undefined;
          }) => [s.id, s.stopCondition] as const
        )
      );
      expect(byId.get(1131211)).toBe(StopCondition.All);
      expect(byId.get(2800217)).toBe(StopCondition.Not);
      expect(byId.get(2800218)).toBe(StopCondition.All);
    });

    it.each([
      ['範囲外 (=sids長)', '1131211,1131310', '2'],
      ['範囲外 (>>sids長)', '1131211,1131310', '99'],
      ['重複', '1131211,1131310,2800217', '1,1'],
      ['昇順でない', '1131211,1131310,2800217', '2,1'],
      ['負数', '1131211,1131310', '-1'],
      ['小数', '1131211,1131310', '0.5'],
      ['非整数文字', '1131211,1131310', '1x'],
      ['指数表記', '1131211,1131310,2800217,2800218', '1e0'],
      ['空トークン', '1131211,1131310', '0,'],
      ['先頭ゼロ付き', '1131211,1131310,2800217', '01'],
    ])('%sの場合はリンク全体をno-opする', async (_label, sids, skips) => {
      mockGetInitialURL.mockResolvedValue(
        `CanaryTrainLCD://route?sids=${sids}&skips=${skips}`
      );
      mockParse.mockReturnValue({
        queryParams: { sids, skips },
      });

      const { mockSetStationState } = setupAtoms();
      const { mockFetchByIds } = setupQueries();

      render(
        <HookBridge
          onReady={() => {
            /* noop */
          }}
        />
      );

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockFetchByIds).not.toHaveBeenCalled();
      expect(mockSetStationState).not.toHaveBeenCalled();
    });
  });
  describe('id (resolver short code)', () => {
    const mockResolveSids = resolveSidsFromShortId as jest.MockedFunction<
      typeof resolveSidsFromShortId
    >;

    afterEach(() => {
      mockResolveSids.mockReset();
    });

    it('idが指定された場合はresolverからsidsを取得しstations(ids)で解決する', async () => {
      const stationA = createStation(1131211, {
        line: { id: 11302 },
      } as Parameters<typeof createStation>[1]);
      const stationB = createStation(1131310, {
        line: { id: 11302 },
      } as Parameters<typeof createStation>[1]);

      mockGetInitialURL.mockResolvedValue(
        'CanaryTrainLCD://route?id=abc123XYZ_-'
      );
      mockParse.mockReturnValue({
        queryParams: { id: 'abc123XYZ_-' },
      });

      mockResolveSids.mockResolvedValue({
        stationIds: [1131211, 1131310],
        skipIndices: null,
        trainType: null,
      });

      const { mockSetStationState } = setupAtoms();
      const { mockFetchByIds, mockFetchByLine, mockFetchByGroup } =
        setupQueries();
      mockFetchByIds.mockResolvedValue({
        data: { stations: [stationA, stationB] },
      });

      render(
        <HookBridge
          onReady={() => {
            /* noop */
          }}
        />
      );

      await waitFor(() => {
        expect(mockFetchByIds).toHaveBeenCalled();
      });

      expect(mockResolveSids).toHaveBeenCalledWith(
        'abc123XYZ_-',
        expect.any(Object)
      );
      expect(mockFetchByIds).toHaveBeenCalledWith({
        variables: { ids: [1131211, 1131310] },
      });
      // legacy/sids queries must not be called when id takes precedence
      expect(mockFetchByLine).not.toHaveBeenCalled();
      expect(mockFetchByGroup).not.toHaveBeenCalled();

      const stationSetter = mockSetStationState.mock.calls[0][0];
      const stationResult = stationSetter(createStationState());
      expect(stationResult.stations.map((s: { id: number }) => s.id)).toEqual([
        1131211, 1131310,
      ]);
      expect(stationResult.selectedDirection).toBe<LineDirection>('INBOUND');
      expect(stationResult.selectedBound?.id).toBe(1131310);
    });

    it.each([
      ['空文字', ''],
      ['33文字超過', 'a'.repeat(33)],
      ['許可外文字 (空白)', 'abc def'],
      ['許可外文字 (記号)', 'abc.def'],
      ['許可外文字 (マルチバイト)', 'abc日本'],
    ])(
      'idが%sの場合はresolverを呼び出さずstateを変更しない',
      async (_label, id) => {
        mockGetInitialURL.mockResolvedValue(`CanaryTrainLCD://route?id=${id}`);
        mockParse.mockReturnValue({ queryParams: { id } });

        const { mockSetStationState } = setupAtoms();
        const { mockFetchByIds } = setupQueries();

        render(
          <HookBridge
            onReady={() => {
              /* noop */
            }}
          />
        );

        await act(async () => {
          await Promise.resolve();
        });

        expect(mockResolveSids).not.toHaveBeenCalled();
        expect(mockFetchByIds).not.toHaveBeenCalled();
        expect(mockSetStationState).not.toHaveBeenCalled();
      }
    );

    it('idが空文字でsidsが併記されていてもsidsへフォールスルーしない', async () => {
      // `?id=&sids=...` would be a malformed share link; receiving it must be a
      // total no-op rather than silently resolving the sids route.
      mockGetInitialURL.mockResolvedValue(
        'CanaryTrainLCD://route?id=&sids=1131211,1131310'
      );
      mockParse.mockReturnValue({
        queryParams: { id: '', sids: '1131211,1131310' },
      });

      const { mockSetStationState } = setupAtoms();
      const { mockFetchByIds } = setupQueries();

      render(
        <HookBridge
          onReady={() => {
            /* noop */
          }}
        />
      );

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockResolveSids).not.toHaveBeenCalled();
      expect(mockFetchByIds).not.toHaveBeenCalled();
      expect(mockSetStationState).not.toHaveBeenCalled();
    });

    it('resolverが404相当のエラーを投げた場合はerrorを公開しstateを変更しない', async () => {
      mockGetInitialURL.mockResolvedValue('CanaryTrainLCD://route?id=missing');
      mockParse.mockReturnValue({ queryParams: { id: 'missing' } });

      mockResolveSids.mockRejectedValue(
        new Error('route resolver responded with 404')
      );

      const { mockSetStationState } = setupAtoms();
      const { mockFetchByIds } = setupQueries();

      const hookRef: { current: HookResult } = { current: null };
      render(
        <HookBridge
          onReady={(value) => {
            hookRef.current = value;
          }}
        />
      );

      await waitFor(() => {
        expect(hookRef.current?.error).toBeTruthy();
      });

      expect(mockFetchByIds).not.toHaveBeenCalled();
      expect(mockSetStationState).not.toHaveBeenCalled();
      expect(hookRef.current?.error?.message).toContain('404');
    });

    it('resolverのネットワークエラー時はerrorを公開する', async () => {
      mockGetInitialURL.mockResolvedValue('CanaryTrainLCD://route?id=net');
      mockParse.mockReturnValue({ queryParams: { id: 'net' } });

      mockResolveSids.mockRejectedValue(new Error('network down'));

      setupAtoms();
      setupQueries();

      const hookRef: { current: HookResult } = { current: null };
      render(
        <HookBridge
          onReady={(value) => {
            hookRef.current = value;
          }}
        />
      );

      await waitFor(() => {
        expect(hookRef.current?.error?.message).toBe('network down');
      });
    });

    it('idが指定されている場合はsids/sgid/lid/lgid/dirを全て無視する', async () => {
      const stationA = createStation(1131211, {
        line: { id: 11302 },
      } as Parameters<typeof createStation>[1]);
      const stationB = createStation(1131310, {
        line: { id: 11302 },
      } as Parameters<typeof createStation>[1]);

      mockGetInitialURL.mockResolvedValue(
        'CanaryTrainLCD://route?id=abc&sids=999,888&sgid=1&lid=2&lgid=3&dir=1'
      );
      mockParse.mockReturnValue({
        queryParams: {
          id: 'abc',
          sids: '999,888',
          sgid: '1',
          lid: '2',
          lgid: '3',
          dir: '1',
        },
      });

      mockResolveSids.mockResolvedValue({
        stationIds: [1131211, 1131310],
        skipIndices: null,
        trainType: null,
      });

      setupAtoms();
      const { mockFetchByIds, mockFetchByLine, mockFetchByGroup } =
        setupQueries();
      mockFetchByIds.mockResolvedValue({
        data: { stations: [stationA, stationB] },
      });

      render(
        <HookBridge
          onReady={() => {
            /* noop */
          }}
        />
      );

      await waitFor(() => {
        expect(mockFetchByIds).toHaveBeenCalledWith({
          variables: { ids: [1131211, 1131310] },
        });
      });
      // sids in the URL must be ignored when id wins precedence
      expect(mockFetchByIds).not.toHaveBeenCalledWith({
        variables: { ids: [999, 888] },
      });
      expect(mockFetchByLine).not.toHaveBeenCalled();
      expect(mockFetchByGroup).not.toHaveBeenCalled();
    });

    it('idでauto/themeを併用できる', async () => {
      const stationA = createStation(1131211, {
        line: { id: 11302 },
      } as Parameters<typeof createStation>[1]);
      const stationB = createStation(1131310, {
        line: { id: 11302 },
      } as Parameters<typeof createStation>[1]);

      mockGetInitialURL.mockResolvedValue(
        'CanaryTrainLCD://route?id=abc&auto=1&theme=AUTO'
      );
      mockParse.mockReturnValue({
        queryParams: { id: 'abc', auto: '1', theme: 'AUTO' },
      });

      mockResolveSids.mockResolvedValue({
        stationIds: [1131211, 1131310],
        skipIndices: null,
        trainType: null,
      });

      const mockSetThemePreference = jest.fn();
      const mockSetStationState = jest.fn();
      const mockSetNavigationState = jest.fn();
      const mockSetLineState = jest.fn();
      const setters = [
        mockSetStationState,
        mockSetNavigationState,
        mockSetLineState,
        mockSetThemePreference,
      ];
      let atomCallIdx = 0;
      mockUseSetAtom.mockImplementation(() => {
        const result = setters[atomCallIdx % setters.length];
        atomCallIdx++;
        return result;
      });

      const { mockFetchByIds } = setupQueries();
      mockFetchByIds.mockResolvedValue({
        data: { stations: [stationA, stationB] },
      });

      render(
        <HookBridge
          onReady={() => {
            /* noop */
          }}
        />
      );

      await waitFor(() => {
        expect(mockFetchByIds).toHaveBeenCalled();
      });

      expect(mockSetThemePreference).toHaveBeenCalledWith('AUTO');
      const navSetter = mockSetNavigationState.mock.calls[0][0];
      const navResult = navSetter(createNavigationState());
      expect(navResult.autoModeEnabled).toBe(true);
    });

    it('resolverが返したskipIndicesが該当駅のstopConditionに反映される', async () => {
      const buildStation = (id: number) =>
        createStation(id, {
          line: { id: 11302 },
          stopCondition: StopCondition.All,
        } as Parameters<typeof createStation>[1]);
      const stations = [
        buildStation(1131211),
        buildStation(1131310),
        buildStation(2800217),
        buildStation(2800218),
      ];

      mockGetInitialURL.mockResolvedValue('CanaryTrainLCD://route?id=withSkip');
      mockParse.mockReturnValue({ queryParams: { id: 'withSkip' } });

      mockResolveSids.mockResolvedValue({
        stationIds: [1131211, 1131310, 2800217, 2800218],
        skipIndices: new Set([1, 2]),
        trainType: null,
      });

      const { mockSetStationState } = setupAtoms();
      const { mockFetchByIds } = setupQueries();
      mockFetchByIds.mockResolvedValue({ data: { stations } });

      render(
        <HookBridge
          onReady={() => {
            /* noop */
          }}
        />
      );

      await waitFor(() => {
        expect(mockFetchByIds).toHaveBeenCalled();
      });

      const stationSetter = mockSetStationState.mock.calls[0][0];
      const stationResult = stationSetter(createStationState());
      const conditions = stationResult.stations.map(
        (s: { stopCondition: StopCondition | null | undefined }) =>
          s.stopCondition
      );
      expect(conditions).toEqual([
        StopCondition.All,
        StopCondition.Not,
        StopCondition.Not,
        StopCondition.All,
      ]);
    });

    it('resolver失敗後にlegacy経路で成功すればerrorはnullに戻る', async () => {
      // Apollo errors auto-reset between queries, but resolverError lives in
      // local state — without an explicit reset the previous failure would
      // leak into the next handleUrl call.
      const mockIsReady = navigationRef.isReady as jest.Mock;
      mockIsReady.mockReturnValue(true);

      const stations = [
        createStation(1, {
          groupId: 1,
          line: { id: 999, nameShort: 'Yamanote' },
          trainType: createTrainType(),
        } as Parameters<typeof createStation>[1]),
        createStation(2, {
          groupId: 2,
          line: { id: 999, nameShort: 'Yamanote' },
        } as Parameters<typeof createStation>[1]),
      ];

      // Skip the initial URL entirely; we drive both calls through the runtime
      // listener. setupAtoms uses `% 3` for the hook's 4 useSetAtom slots,
      // which destabilizes useCallback deps and re-runs the addEventListener
      // effect after each re-render — feeding a persistent initial URL here
      // would cause it to be re-processed on every re-render.
      mockGetInitialURL.mockResolvedValue(null);
      mockParse.mockImplementation((url: string) => {
        if (url.includes('id=missing')) {
          return { queryParams: { id: 'missing' } };
        }
        return {
          queryParams: { lid: '999', sgid: '1', dir: '0' },
        };
      });

      mockResolveSids.mockRejectedValue(
        new Error('route resolver responded with 404')
      );

      setupAtoms();
      const { mockFetchByLine } = setupQueries();
      mockFetchByLine.mockResolvedValue({
        data: { lineStations: stations },
      });

      const hookRef: { current: HookResult } = { current: null };
      render(
        <HookBridge
          onReady={(value) => {
            hookRef.current = value;
          }}
        />
      );

      // Always grab the most recently registered listener — the effect re-runs
      // on every re-render due to the setupAtoms slot drift.
      const fireLatestListener = async (url: string) => {
        const lastCall = mockAddEventListener.mock.calls.at(-1) ?? [];
        const listenerCallback = lastCall[1];
        await act(async () => {
          await listenerCallback({ url });
        });
      };

      // 1. resolver-failing URL → resolverError gets populated
      await fireLatestListener('CanaryTrainLCD://route?id=missing');
      await waitFor(() => {
        expect(hookRef.current?.error?.message).toContain('404');
      });

      // 2. legacy success URL → resolverError must be cleared
      await fireLatestListener('CanaryTrainLCD://?lid=999&sgid=1&dir=0');
      await waitFor(() => {
        expect(hookRef.current?.error).toBeFalsy();
      });
    });

    it('resolver取得中はisLoadingがtrue', async () => {
      mockGetInitialURL.mockResolvedValue('CanaryTrainLCD://route?id=slow');
      mockParse.mockReturnValue({ queryParams: { id: 'slow' } });

      type ResolvedRoute = Awaited<ReturnType<typeof resolveSidsFromShortId>>;
      let resolveResolver: (value: ResolvedRoute) => void = () => {};
      mockResolveSids.mockImplementation(
        () =>
          new Promise<ResolvedRoute>((resolve) => {
            resolveResolver = resolve;
          })
      );

      setupAtoms();
      setupQueries();

      const hookRef: { current: HookResult } = { current: null };
      render(
        <HookBridge
          onReady={(value) => {
            hookRef.current = value;
          }}
        />
      );

      // Wait for resolverLoading to flip after the async chain kicks off
      await waitFor(() => {
        expect(hookRef.current?.isLoading).toBe(true);
      });

      await act(async () => {
        resolveResolver({
          stationIds: [1131211, 1131310],
          skipIndices: null,
          trainType: null,
        });
        await Promise.resolve();
      });
    });

    it('resolverがtrainTypeを返した場合はnavigationStateに反映される', async () => {
      const stationA = createStation(1131211, {
        line: { id: 11302 },
        trainType: createTrainType({ typeId: 9999 }),
      } as Parameters<typeof createStation>[1]);
      const stationB = createStation(1131310, {
        line: { id: 11302 },
        trainType: createTrainType({ typeId: 9999 }),
      } as Parameters<typeof createStation>[1]);

      mockGetInitialURL.mockResolvedValue('CanaryTrainLCD://route?id=withTT');
      mockParse.mockReturnValue({ queryParams: { id: 'withTT' } });

      mockResolveSids.mockResolvedValue({
        stationIds: [1131211, 1131310],
        skipIndices: null,
        trainType: {
          __typename: 'TrainTypeNested',
          name: '快速',
          color: '#ff0000',
          kind: null,
          direction: null,
          nameRoman: null,
          nameKatakana: null,
          nameChinese: null,
          nameKorean: null,
          nameIpa: null,
          nameRomanIpa: null,
          id: null,
          typeId: null,
          groupId: null,
          line: null,
          lines: null,
          nameTtsSegments: null,
        },
      });

      const { mockSetStationState, mockSetNavigationState } = setupAtoms();
      const { mockFetchByIds } = setupQueries();
      mockFetchByIds.mockResolvedValue({
        data: { stations: [stationA, stationB] },
      });

      render(
        <HookBridge
          onReady={() => {
            /* noop */
          }}
        />
      );

      await waitFor(() => {
        expect(mockFetchByIds).toHaveBeenCalled();
      });

      const navSetter = mockSetNavigationState.mock.calls[0][0];
      const navResult = navSetter(createNavigationState());
      expect(navResult.trainType).toMatchObject({
        name: '快速',
        color: '#ff0000',
      });
      // server-derived typeId must not leak into the override
      expect(navResult.trainType?.typeId).toBeNull();

      // every station in stationState carries the override so useCurrentTrainType
      // (which looks at stations[].trainType when transferring lines) keeps the
      // shared TrainType stable.
      const stationSetter = mockSetStationState.mock.calls[0][0];
      const stationResult = stationSetter(createStationState());
      for (const sta of stationResult.stations) {
        expect(sta.trainType).toMatchObject({
          name: '快速',
          color: '#ff0000',
        });
      }
    });
  });

  describe('tt* parameters (custom TrainType override)', () => {
    const mockResolveSids = resolveSidsFromShortId as jest.MockedFunction<
      typeof resolveSidsFromShortId
    >;

    afterEach(() => {
      mockResolveSids.mockReset();
    });

    const buildTwoStations = () => [
      createStation(1131211, {
        line: { id: 11302 },
        trainType: createTrainType({ typeId: 9999 }),
      } as Parameters<typeof createStation>[1]),
      createStation(1131310, {
        line: { id: 11302 },
        trainType: createTrainType({ typeId: 9999 }),
      } as Parameters<typeof createStation>[1]),
    ];

    it('sids 形式で ttname + ttcolor が指定されたら navigationState.trainType が上書きされる', async () => {
      mockGetInitialURL.mockResolvedValue(
        'CanaryTrainLCD://route?sids=1131211,1131310&ttname=%E5%BF%AB%E9%80%9F&ttcolor=%23ff0000'
      );
      mockParse.mockReturnValue({
        queryParams: {
          sids: '1131211,1131310',
          ttname: '快速',
          ttcolor: '#ff0000',
        },
      });

      const { mockSetStationState, mockSetNavigationState } = setupAtoms();
      const { mockFetchByIds } = setupQueries();
      mockFetchByIds.mockResolvedValue({
        data: { stations: buildTwoStations() },
      });

      render(
        <HookBridge
          onReady={() => {
            /* noop */
          }}
        />
      );

      await waitFor(() => {
        expect(mockFetchByIds).toHaveBeenCalled();
      });

      const navSetter = mockSetNavigationState.mock.calls[0][0];
      const navResult = navSetter(createNavigationState());
      expect(navResult.trainType).toMatchObject({
        __typename: 'TrainTypeNested',
        name: '快速',
        color: '#ff0000',
      });
      // override never carries a server typeId / groupId
      expect(navResult.trainType?.typeId).toBeNull();
      expect(navResult.trainType?.groupId).toBeNull();

      // stations[].trainType is replaced too, so useCurrentTrainType stays
      // pinned to the override even on line transfers.
      const stationSetter = mockSetStationState.mock.calls[0][0];
      const stationResult = stationSetter(createStationState());
      for (const sta of stationResult.stations) {
        expect(sta.trainType?.name).toBe('快速');
        expect(sta.trainType?.color).toBe('#ff0000');
        expect(sta.trainType?.typeId).toBeNull();
      }
    });

    it('sgid+lid 形式でも ttname + ttcolor が反映される', async () => {
      const stations = [
        createStation(1, {
          groupId: 1,
          line: { id: 999, nameShort: 'Yamanote' },
          trainType: createTrainType({ typeId: 9999 }),
        } as Parameters<typeof createStation>[1]),
        createStation(2, {
          groupId: 2,
          line: { id: 999, nameShort: 'Yamanote' },
          trainType: createTrainType({ typeId: 9999 }),
        } as Parameters<typeof createStation>[1]),
      ];

      mockGetInitialURL.mockResolvedValue(
        'CanaryTrainLCD://?lid=999&sgid=1&dir=0&ttname=%E5%BF%AB%E9%80%9F&ttcolor=%23ff0000'
      );
      mockParse.mockReturnValue({
        queryParams: {
          lid: '999',
          sgid: '1',
          dir: '0',
          ttname: '快速',
          ttcolor: '#ff0000',
        },
      });

      const { mockSetStationState, mockSetNavigationState } = setupAtoms();
      const { mockFetchByLine } = setupQueries();
      mockFetchByLine.mockResolvedValue({
        data: { lineStations: stations },
      });

      render(
        <HookBridge
          onReady={() => {
            /* noop */
          }}
        />
      );

      await waitFor(() => {
        expect(mockFetchByLine).toHaveBeenCalled();
      });

      const navSetter = mockSetNavigationState.mock.calls[0][0];
      const navResult = navSetter(createNavigationState());
      expect(navResult.trainType?.name).toBe('快速');
      expect(navResult.trainType?.color).toBe('#ff0000');

      const stationSetter = mockSetStationState.mock.calls[0][0];
      const stationResult = stationSetter(createStationState());
      for (const sta of stationResult.stations) {
        expect(sta.trainType?.name).toBe('快速');
      }
    });

    it('ttkind / ttnameroman 等の任意フィールドも反映される', async () => {
      mockGetInitialURL.mockResolvedValue(
        'CanaryTrainLCD://route?sids=1131211,1131310&ttname=Rapid&ttcolor=%23ff0000&ttkind=Rapid&ttnameroman=Rapid'
      );
      mockParse.mockReturnValue({
        queryParams: {
          sids: '1131211,1131310',
          ttname: 'Rapid',
          ttcolor: '#ff0000',
          ttkind: 'Rapid',
          ttnameroman: 'Rapid',
        },
      });

      const { mockSetNavigationState } = setupAtoms();
      const { mockFetchByIds } = setupQueries();
      mockFetchByIds.mockResolvedValue({
        data: { stations: buildTwoStations() },
      });

      render(
        <HookBridge
          onReady={() => {
            /* noop */
          }}
        />
      );

      await waitFor(() => {
        expect(mockFetchByIds).toHaveBeenCalled();
      });

      const navSetter = mockSetNavigationState.mock.calls[0][0];
      const navResult = navSetter(createNavigationState());
      expect(navResult.trainType).toMatchObject({
        name: 'Rapid',
        color: '#ff0000',
        kind: 'Rapid',
        nameRoman: 'Rapid',
      });
    });

    it.each([
      [
        'ttname 欠落で他フィールドあり',
        { ttcolor: '#ff0000', ttkind: 'Rapid' },
      ],
      ['ttcolor 欠落で他フィールドあり', { ttname: '快速', ttkind: 'Rapid' }],
      ['ttkind だけ', { ttkind: 'Rapid' }],
      ['ttnameroman だけ', { ttnameroman: 'Rapid' }],
      ['ttcolor が #RRGGBB 形式外', { ttname: '快速', ttcolor: 'red' }],
      ['ttcolor が #fff (3桁)', { ttname: '快速', ttcolor: '#fff' }],
      [
        'ttkind が enum 外',
        { ttname: '快速', ttcolor: '#ff0000', ttkind: 'Unknown' },
      ],
    ])(
      'sids 形式: %s の場合はリンク全体を no-op',
      async (_label, extraParams) => {
        mockGetInitialURL.mockResolvedValue(
          'CanaryTrainLCD://route?sids=1131211,1131310'
        );
        mockParse.mockReturnValue({
          queryParams: {
            sids: '1131211,1131310',
            ...extraParams,
          },
        });

        const { mockSetStationState } = setupAtoms();
        const { mockFetchByIds } = setupQueries();

        render(
          <HookBridge
            onReady={() => {
              /* noop */
            }}
          />
        );

        await act(async () => {
          await Promise.resolve();
        });

        expect(mockFetchByIds).not.toHaveBeenCalled();
        expect(mockSetStationState).not.toHaveBeenCalled();
      }
    );

    it.each([
      ['ttname 欠落', { ttcolor: '#ff0000' }],
      ['ttcolor 欠落', { ttname: '快速' }],
      [
        'ttkind が enum 外',
        { ttname: '快速', ttcolor: '#ff0000', ttkind: 'Unknown' },
      ],
    ])(
      'sgid+lid 形式: %s の場合はリンク全体を no-op',
      async (_label, extraParams) => {
        mockGetInitialURL.mockResolvedValue(
          'CanaryTrainLCD://?lid=999&sgid=1&dir=0'
        );
        mockParse.mockReturnValue({
          queryParams: {
            lid: '999',
            sgid: '1',
            dir: '0',
            ...extraParams,
          },
        });

        const { mockSetStationState } = setupAtoms();
        const { mockFetchByLine, mockFetchByGroup } = setupQueries();

        render(
          <HookBridge
            onReady={() => {
              /* noop */
            }}
          />
        );

        await act(async () => {
          await Promise.resolve();
        });

        expect(mockFetchByLine).not.toHaveBeenCalled();
        expect(mockFetchByGroup).not.toHaveBeenCalled();
        expect(mockSetStationState).not.toHaveBeenCalled();
      }
    );

    it('id 形式の場合は URL の tt* は無視される (resolver の trainType だけが使われる)', async () => {
      // URL has tt* but `?id=` wins precedence — even an invalid tt* combo here
      // must not reject the link, because the resolver payload is the
      // authoritative source.
      mockGetInitialURL.mockResolvedValue(
        'CanaryTrainLCD://route?id=abc&ttname=%E5%BF%AB%E9%80%9F&ttcolor=notHex'
      );
      mockParse.mockReturnValue({
        queryParams: { id: 'abc', ttname: '快速', ttcolor: 'notHex' },
      });

      mockResolveSids.mockResolvedValue({
        stationIds: [1131211, 1131310],
        skipIndices: null,
        trainType: null,
      });

      const { mockSetNavigationState } = setupAtoms();
      const { mockFetchByIds } = setupQueries();
      mockFetchByIds.mockResolvedValue({
        data: { stations: buildTwoStations() },
      });

      render(
        <HookBridge
          onReady={() => {
            /* noop */
          }}
        />
      );

      await waitFor(() => {
        expect(mockFetchByIds).toHaveBeenCalled();
      });

      // resolver supplied null trainType, so navigationState.trainType falls
      // back to the head station's server-derived trainType.
      const navSetter = mockSetNavigationState.mock.calls[0][0];
      const navResult = navSetter(createNavigationState());
      expect(navResult.trainType?.typeId).toBe(9999);
    });

    it('ttname / ttcolor が両方とも未指定なら override はせずレガシー挙動', async () => {
      mockGetInitialURL.mockResolvedValue(
        'CanaryTrainLCD://route?sids=1131211,1131310'
      );
      mockParse.mockReturnValue({
        queryParams: { sids: '1131211,1131310' },
      });

      const { mockSetNavigationState } = setupAtoms();
      const { mockFetchByIds } = setupQueries();
      mockFetchByIds.mockResolvedValue({
        data: { stations: buildTwoStations() },
      });

      render(
        <HookBridge
          onReady={() => {
            /* noop */
          }}
        />
      );

      await waitFor(() => {
        expect(mockFetchByIds).toHaveBeenCalled();
      });

      const navSetter = mockSetNavigationState.mock.calls[0][0];
      const navResult = navSetter(createNavigationState());
      // head station's server-derived trainType is preserved as-is
      expect(navResult.trainType?.typeId).toBe(9999);
    });
  });

  it('ナビゲーターがリトライ中に準備完了した場合はナビゲートする', async () => {
    const mockDispatch = navigationRef.dispatch as jest.Mock;
    const mockIsReady = navigationRef.isReady as jest.Mock;
    // First two calls return false (navigateToMain check + waitForNavReady first check),
    // then true on the first retry
    mockIsReady
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValue(true);

    const stations = [
      createStation(1, {
        groupId: 1,
        line: { id: 999, nameShort: 'Yamanote' },
        trainType: createTrainType(),
      } as Parameters<typeof createStation>[1]),
      createStation(2, {
        groupId: 2,
        line: { id: 999, nameShort: 'Yamanote' },
      } as Parameters<typeof createStation>[1]),
    ];

    mockGetInitialURL.mockResolvedValue(
      'CanaryTrainLCD://?lid=999&sgid=1&dir=0'
    );
    mockParse.mockReturnValue({
      queryParams: { lid: '999', sgid: '1', dir: '0' },
    });

    setupAtoms();
    const { mockFetchByLine } = setupQueries();
    mockFetchByLine.mockResolvedValue({
      data: { lineStations: stations },
    });

    render(
      <HookBridge
        onReady={() => {
          /* noop */
        }}
      />
    );

    // Wait for the retry to succeed and dispatch to be called (~100ms for first retry)
    await waitFor(
      () => {
        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'NAVIGATE',
            payload: { name: 'MainStack', params: { screen: 'Main' } },
          })
        );
      },
      { timeout: 5000 }
    );
  });
});
