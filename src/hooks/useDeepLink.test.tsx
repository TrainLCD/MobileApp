import { useLazyQuery } from '@apollo/client/react';
import { act, render, waitFor } from '@testing-library/react-native';
import * as Linking from 'expo-linking';
import { useSetAtom } from 'jotai';
import type React from 'react';
import type { TrainType } from '~/@types/graphql';
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

  it('sidsとdir=1の場合はselectedBoundが先頭駅になる', async () => {
    const stationA = createStation(1131211, {
      line: { id: 11302 },
    } as Parameters<typeof createStation>[1]);
    const stationB = createStation(1131310, {
      line: { id: 11302 },
    } as Parameters<typeof createStation>[1]);

    mockGetInitialURL.mockResolvedValue(
      'CanaryTrainLCD://route?sids=1131211,1131310&dir=1'
    );
    mockParse.mockReturnValue({
      queryParams: { sids: '1131211,1131310', dir: '1' },
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
    expect(stationResult.selectedDirection).toBe<LineDirection>('OUTBOUND');
    expect(stationResult.selectedBound?.id).toBe(1131211);
  });

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

  it('sidsでdirが不正値の場合はstateを変更しない', async () => {
    mockGetInitialURL.mockResolvedValue(
      'CanaryTrainLCD://route?sids=1131211,1131310&dir=2'
    );
    mockParse.mockReturnValue({
      queryParams: { sids: '1131211,1131310', dir: '2' },
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

  it('sidsが指定されている場合はsgid/lid/lgidを無視する', async () => {
    const station = createStation(1131211, {
      line: { id: 11302 },
    } as Parameters<typeof createStation>[1]);

    mockGetInitialURL.mockResolvedValue(
      'CanaryTrainLCD://route?sids=1131211,1131310&sgid=99&lid=999&lgid=42&dir=0'
    );
    mockParse.mockReturnValue({
      queryParams: {
        sids: '1131211,1131310',
        sgid: '99',
        lid: '999',
        lgid: '42',
        dir: '0',
      },
    });

    setupAtoms();
    const { mockFetchByIds, mockFetchByLine, mockFetchByGroup } =
      setupQueries();
    mockFetchByIds.mockResolvedValue({
      data: { stations: [station] },
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
