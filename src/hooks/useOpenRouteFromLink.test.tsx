import { useLazyQuery } from '@apollo/client/react';
import { act, render } from '@testing-library/react-native';
import { useSetAtom } from 'jotai';
import type React from 'react';
import type { TrainType } from '~/@types/graphql';
import { createStation } from '~/utils/test/factories';
import type { LineDirection } from '../models/Bound';
import type { LineState } from '../store/atoms/line';
import type { NavigationState } from '../store/atoms/navigation';
import type { StationState } from '../store/atoms/station';
import { useOpenRouteFromLink } from './useOpenRouteFromLink';

jest.mock('@apollo/client/react', () => ({
  useLazyQuery: jest.fn(),
}));
jest.mock('jotai', () => ({
  useSetAtom: jest.fn(),
  atom: jest.fn(),
}));

type HookResult = ReturnType<typeof useOpenRouteFromLink> | null;

const HookBridge: React.FC<{ onReady: (value: HookResult) => void }> = ({
  onReady,
}) => {
  onReady(useOpenRouteFromLink());
  return null;
};

const createTrainType = (
  overrides: Partial<TrainType> = {},
  typename: TrainType['__typename'] = 'TrainTypeNested'
): TrainType =>
  ({
    __typename: typename,
    typeId: 'local',
    name: 'Local',
    nameRoman: 'Local',
    color: '#fff',
    ...overrides,
  }) as TrainType;

const createStationState = (
  overrides: Partial<StationState> = {}
): StationState => ({
  arrived: false,
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
  ...overrides,
});

const createLineState = (overrides: Partial<LineState> = {}): LineState => ({
  selectedLine: null,
  pendingLine: null,
  ...overrides,
});

describe('useOpenRouteFromLink', () => {
  const mockUseLazyQuery = useLazyQuery as unknown as jest.Mock;
  const mockUseSetAtom = useSetAtom as jest.MockedFunction<typeof useSetAtom>;

  const setupMolecules = () => {
    const mockSetStationState = jest.fn();
    const mockSetNavigationState = jest.fn();
    const mockSetLineState = jest.fn();
    mockUseSetAtom
      .mockReturnValueOnce(mockSetStationState)
      .mockReturnValueOnce(mockSetNavigationState)
      .mockReturnValueOnce(mockSetLineState);
    return { mockSetStationState, mockSetNavigationState, mockSetLineState };
  };

  const setupQueries = ({
    groupLoading = false,
    lineLoading = false,
    groupError,
    lineError,
  }: {
    groupLoading?: boolean;
    lineLoading?: boolean;
    groupError?: Error;
    lineError?: Error;
  } = {}) => {
    const mockFetchByGroup = jest.fn();
    const mockFetchByLine = jest.fn();
    mockUseLazyQuery
      .mockReturnValueOnce([
        mockFetchByGroup,
        { loading: groupLoading, error: groupError },
      ])
      .mockReturnValueOnce([
        mockFetchByLine,
        { loading: lineLoading, error: lineError },
      ]);
    return { mockFetchByGroup, mockFetchByLine };
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('lineGroupId が指定された場合、取得した駅に基づいて state を更新する', async () => {
    const { mockSetStationState, mockSetNavigationState, mockSetLineState } =
      setupMolecules();
    const { mockFetchByGroup } = setupQueries();
    const stations = [
      createStation(1, {
        groupId: 1,
        line: { id: 999, nameShort: 'Main' },
        trainType: createTrainType(),
      } as Parameters<typeof createStation>[1]),
      createStation(2, {
        groupId: 2,
        line: { id: 999, nameShort: 'Main' },
        trainType: createTrainType(),
      } as Parameters<typeof createStation>[1]),
    ];
    mockFetchByGroup.mockResolvedValue({
      data: { lineGroupStations: stations },
    });

    const hookRef: { current: HookResult } = { current: null };
    const handleReady = (value: HookResult) => {
      hookRef.current = value;
    };
    render(<HookBridge onReady={handleReady} />);

    await act(async () => {
      await hookRef.current?.openLink({
        stationGroupId: 1,
        direction: 0,
        lineGroupId: 10,
        lineId: undefined,
      });
    });

    expect(mockFetchByGroup).toHaveBeenCalledWith({
      variables: { lineGroupId: 10 },
    });

    const stationSetter = mockSetStationState.mock.calls[0][0];
    const stationResult = stationSetter(createStationState());
    expect(stationResult.pendingStation?.groupId).toBe(1);
    expect(stationResult.pendingStations).toEqual(stations);
    expect(stationResult.selectedDirection).toBe<LineDirection>('INBOUND');
    expect(stationResult.selectedBound?.groupId).toBe(2);

    const navigationSetter = mockSetNavigationState.mock.calls[0][0];
    const navigationResult = navigationSetter(createNavigationState());
    expect(navigationResult.pendingTrainType?.typeId).toBe('local');
    expect(navigationResult.stationForHeader?.groupId).toBe(1);

    const lineSetter = mockSetLineState.mock.calls[0][0];
    const lineResult = lineSetter(createLineState());
    expect(lineResult.selectedLine?.id).toBe(999);
  });

  it('lineId が指定された場合でも同様に state を更新する', async () => {
    const { mockSetStationState } = setupMolecules();
    const { mockFetchByGroup, mockFetchByLine } = setupQueries();
    mockFetchByGroup.mockResolvedValue({ data: { lineGroupStations: [] } });
    const stations = [
      createStation(5, { groupId: 5 }),
      createStation(9, { groupId: 9 }),
    ];
    mockFetchByLine.mockResolvedValue({ data: { lineStations: stations } });

    const hookRef: { current: HookResult } = { current: null };
    const handleReady = (value: HookResult) => {
      hookRef.current = value;
    };
    render(<HookBridge onReady={handleReady} />);

    await act(async () => {
      await hookRef.current?.openLink({
        stationGroupId: 9,
        direction: 1,
        lineGroupId: undefined,
        lineId: 55,
      });
    });

    expect(mockFetchByLine).toHaveBeenCalledWith({ variables: { lineId: 55 } });
    const stationSetter = mockSetStationState.mock.calls[0][0];
    const result = stationSetter(createStationState());
    expect(result.selectedDirection).toBe<LineDirection>('OUTBOUND');
    expect(result.selectedBound?.groupId).toBe(5);
  });

  it('駅が見つからなければ state を変更しない', async () => {
    const { mockSetStationState, mockSetNavigationState, mockSetLineState } =
      setupMolecules();
    const { mockFetchByGroup, mockFetchByLine } = setupQueries();
    mockFetchByGroup.mockResolvedValue({ data: { lineGroupStations: [] } });
    mockFetchByLine.mockResolvedValue({ data: { lineStations: [] } });

    const hookRef: { current: HookResult } = { current: null };
    const handleReady = (value: HookResult) => {
      hookRef.current = value;
    };
    render(<HookBridge onReady={handleReady} />);

    await act(async () => {
      await hookRef.current?.openLink({
        stationGroupId: 99,
        direction: 0,
        lineGroupId: 1,
        lineId: undefined,
      });
      await hookRef.current?.openLink({
        stationGroupId: 99,
        direction: 0,
        lineGroupId: undefined,
        lineId: 7,
      });
    });

    expect(mockSetStationState).not.toHaveBeenCalled();
    expect(mockSetNavigationState).not.toHaveBeenCalled();
    expect(mockSetLineState).not.toHaveBeenCalled();
  });

  it('loading / error フラグを集約する', () => {
    setupMolecules();
    setupQueries({
      groupLoading: true,
      lineLoading: false,
      groupError: new Error('group'),
    });

    const hookRef: { current: HookResult } = { current: null };
    const handleReady = (value: HookResult) => {
      hookRef.current = value;
    };
    render(<HookBridge onReady={handleReady} />);

    expect(hookRef.current?.isLoading).toBe(true);
    expect(hookRef.current?.error?.message).toBe('group');
  });
});
