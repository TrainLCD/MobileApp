import { useLazyQuery } from '@apollo/client/react';
import { act, render } from '@testing-library/react-native';
import { useAtomValue, useSetAtom } from 'jotai';
import type React from 'react';
import type { Line, TrainType } from '~/@types/graphql';
import { createLine, createStation } from '~/utils/test/factories';
import type { LineState } from '../store/atoms/line';
import type { NavigationState } from '../store/atoms/navigation';
import type { StationState } from '../store/atoms/station';
import {
  type UseLineSelectionResult,
  useLineSelection,
} from './useLineSelection';

jest.mock('@apollo/client/react', () => ({
  useLazyQuery: jest.fn(),
}));
jest.mock('jotai', () => ({
  useSetAtom: jest.fn(),
  useAtomValue: jest.fn(),
  atom: jest.fn(),
}));

type HookResult = UseLineSelectionResult | null;

const HookBridge: React.FC<{ onReady: (value: HookResult) => void }> = ({
  onReady,
}) => {
  onReady(useLineSelection());
  return null;
};

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

describe('useLineSelection', () => {
  const mockUseLazyQuery = useLazyQuery as unknown as jest.Mock;
  const mockUseSetAtom = useSetAtom as unknown as jest.Mock;
  const mockUseAtomValue = useAtomValue as unknown as jest.Mock;

  const setupMolecules = () => {
    const mockSetStationState = jest.fn();
    const mockSetLineState = jest.fn();
    const mockSetNavigationState = jest.fn();

    // useSetAtom は stationState, lineStateAtom, navigationState の順で呼ばれる
    // React 19 の double-invoke でも安定するよう mockImplementation を使用
    const setters = [
      mockSetStationState,
      mockSetLineState,
      mockSetNavigationState,
    ];
    let setterIndex = 0;
    mockUseSetAtom.mockImplementation(() => {
      const setter = setters[setterIndex % setters.length];
      setterIndex++;
      return setter;
    });

    // useAtomValue(locationAtom)
    mockUseAtomValue.mockReturnValue(null);

    return { mockSetStationState, mockSetLineState, mockSetNavigationState };
  };

  const setupQueries = ({
    lineLoading = false,
    groupLoading = false,
    trainTypesLoading = false,
    lineError,
    groupError,
    trainTypesError,
  }: {
    lineLoading?: boolean;
    groupLoading?: boolean;
    trainTypesLoading?: boolean;
    lineError?: Error;
    groupError?: Error;
    trainTypesError?: Error;
  } = {}) => {
    const mockFetchByLineId = jest.fn();
    const mockFetchByGroupId = jest.fn();
    const mockFetchTrainTypes = jest.fn();

    // useLazyQuery は GET_LINE_STATIONS, GET_LINE_GROUP_STATIONS, GET_STATION_TRAIN_TYPES_LIGHT の順
    const queryResults = [
      [mockFetchByLineId, { loading: lineLoading, error: lineError }],
      [mockFetchByGroupId, { loading: groupLoading, error: groupError }],
      [
        mockFetchTrainTypes,
        { loading: trainTypesLoading, error: trainTypesError },
      ],
    ];
    let queryIndex = 0;
    mockUseLazyQuery.mockImplementation(() => {
      const result = queryResults[queryIndex % queryResults.length];
      queryIndex++;
      return result;
    });

    return { mockFetchByLineId, mockFetchByGroupId, mockFetchTrainTypes };
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('handleLineSelected が路線の駅を取得して state を更新する', async () => {
    const { mockSetStationState, mockSetLineState, mockSetNavigationState } =
      setupMolecules();
    const { mockFetchByLineId } = setupQueries();

    const stations = [
      createStation(10, { line: { id: 100 } }),
      createStation(20, { line: { id: 100 } }),
    ];
    mockFetchByLineId.mockResolvedValue({
      data: { lineStations: stations },
    });

    const line = createLine(100, {
      station: { id: 10, hasTrainTypes: false } as Line['station'],
    });

    const hookRef: { current: HookResult } = { current: null };
    render(
      <HookBridge
        onReady={(v) => {
          hookRef.current = v;
        }}
      />
    );

    await act(async () => {
      await hookRef.current?.handleLineSelected(line);
    });

    expect(mockFetchByLineId).toHaveBeenCalledWith({
      variables: { lineId: 100, stationId: 10 },
    });

    // 最初の呼び出し: 初期リセット
    const firstStationSetter = mockSetStationState.mock.calls[0][0];
    const firstResult = firstStationSetter(createStationState());
    expect(firstResult.pendingStation).toBeNull();
    expect(firstResult.selectedDirection).toBeNull();

    // 2回目の呼び出し: 取得した駅で更新
    const secondStationSetter = mockSetStationState.mock.calls[1][0];
    const secondResult = secondStationSetter(createStationState());
    expect(secondResult.pendingStation?.id).toBe(10);
    expect(secondResult.pendingStations).toEqual(stations);

    // lineState 更新
    const lineSetter = mockSetLineState.mock.calls[0][0];
    const lineResult = lineSetter(createLineState());
    expect(lineResult.pendingLine?.id).toBe(100);

    // navigationState リセット
    const navSetter = mockSetNavigationState.mock.calls[0][0];
    const navResult = navSetter(createNavigationState());
    expect(navResult.fetchedTrainTypes).toEqual([]);
    expect(navResult.pendingTrainType).toBeNull();
  });

  it('handleTrainTypeSelect が groupId で駅を取得する', async () => {
    const { mockSetStationState, mockSetNavigationState } = setupMolecules();
    const { mockFetchByGroupId } = setupQueries();

    const stations = [createStation(30)];
    mockFetchByGroupId.mockResolvedValue({
      data: { lineGroupStations: stations },
    });

    const trainType = {
      id: 1,
      groupId: 500,
      name: 'Express',
    } as TrainType;

    const hookRef: { current: HookResult } = { current: null };
    render(
      <HookBridge
        onReady={(v) => {
          hookRef.current = v;
        }}
      />
    );

    await act(async () => {
      await hookRef.current?.handleTrainTypeSelect(trainType);
    });

    expect(mockFetchByGroupId).toHaveBeenCalledWith({
      variables: { lineGroupId: 500 },
    });

    const stationSetter = mockSetStationState.mock.calls[0][0];
    const result = stationSetter(createStationState());
    expect(result.pendingStations).toEqual(stations);

    const navSetter = mockSetNavigationState.mock.calls[0][0];
    const navResult = navSetter(createNavigationState());
    expect(navResult.pendingTrainType).toBe(trainType);
  });

  it('handleCloseSelectBoundModal が isSelectBoundModalOpen を false にする', () => {
    setupMolecules();
    setupQueries();

    const hookRef: { current: HookResult } = { current: null };
    render(
      <HookBridge
        onReady={(v) => {
          hookRef.current = v;
        }}
      />
    );

    expect(hookRef.current?.isSelectBoundModalOpen).toBe(false);

    act(() => {
      hookRef.current?.handleCloseSelectBoundModal();
    });

    expect(hookRef.current?.isSelectBoundModalOpen).toBe(false);
  });

  it('loading/error フラグを集約する', () => {
    setupMolecules();

    const lineError = new Error('line error');
    setupQueries({ lineLoading: true, lineError });

    const hookRef: { current: HookResult } = { current: null };
    render(
      <HookBridge
        onReady={(v) => {
          hookRef.current = v;
        }}
      />
    );

    expect(hookRef.current?.fetchStationsByLineIdLoading).toBe(true);
    expect(hookRef.current?.fetchStationsByLineIdError?.message).toBe(
      'line error'
    );
  });
});
