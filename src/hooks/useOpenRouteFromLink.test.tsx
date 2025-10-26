import { act, render } from '@testing-library/react-native';
import type { LineDirection } from '../models/Bound';
import type { Station, TrainType } from '~/@types/graphql';
import React from 'react';
import { useLazyQuery } from '@apollo/client/react';
import { useSetAtom } from 'jotai';
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

const createTrainType = (overrides: Partial<TrainType> = {}): TrainType =>
  ({
    __typename: 'TrainType',
    typeId: 'local',
    name: 'Local',
    nameRoman: 'Local',
    color: '#fff',
    ...overrides,
  }) as TrainType;

const createStation = (overrides: Partial<Station> = {}): Station =>
  ({
    __typename: 'Station',
    id: 1,
    groupId: 1,
    name: 'Shibuya',
    nameRoman: 'Shibuya',
    line: {
      __typename: 'Line',
      id: 999,
      nameShort: 'Main',
      name: 'Main',
    },
    trainType: createTrainType(),
    ...overrides,
  }) as Station;

describe('useOpenRouteFromLink', () => {
  const mockUseLazyQuery = useLazyQuery as jest.MockedFunction<
    typeof useLazyQuery
  >;
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
    groupError = null,
    lineError = null,
  }: {
    groupLoading?: boolean;
    lineLoading?: boolean;
    groupError?: Error | null;
    lineError?: Error | null;
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lineGroupId が指定された場合、取得した駅に基づいて state を更新する', async () => {
    const { mockSetStationState, mockSetNavigationState, mockSetLineState } =
      setupMolecules();
    const { mockFetchByGroup } = setupQueries();
    const stations = [
      createStation({ groupId: 1 }),
      createStation({ id: 2, groupId: 2 }),
    ];
    mockFetchByGroup.mockResolvedValue({
      data: { lineGroupStations: stations },
    });

    let hook: HookResult = null;
    render(<HookBridge onReady={(value) => (hook = value)} />);

    await act(async () => {
      await hook?.openLink({
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
    const stationResult = stationSetter({ stations: [] } as any);
    expect(stationResult.station?.groupId).toBe(1);
    expect(stationResult.stations).toEqual(stations);
    expect(stationResult.selectedDirection).toBe<LineDirection>('INBOUND');
    expect(stationResult.selectedBound?.groupId).toBe(2);

    const navigationSetter = mockSetNavigationState.mock.calls[0][0];
    const navigationResult = navigationSetter({ leftStations: [] } as any);
    expect(navigationResult.trainType?.typeId).toBe('local');
    expect(navigationResult.stationForHeader?.groupId).toBe(1);

    const lineSetter = mockSetLineState.mock.calls[0][0];
    const lineResult = lineSetter({} as any);
    expect(lineResult.selectedLine?.id).toBe(999);
  });

  it('lineId が指定された場合でも同様に state を更新する', async () => {
    const { mockSetStationState } = setupMolecules();
    const { mockFetchByGroup, mockFetchByLine } = setupQueries();
    mockFetchByGroup.mockResolvedValue({ data: { lineGroupStations: [] } });
    const stations = [
      createStation({ groupId: 5 }),
      createStation({ groupId: 9 }),
    ];
    mockFetchByLine.mockResolvedValue({ data: { lineStations: stations } });

    let hook: HookResult = null;
    render(<HookBridge onReady={(value) => (hook = value)} />);

    await act(async () => {
      await hook?.openLink({
        stationGroupId: 9,
        direction: 1,
        lineGroupId: undefined,
        lineId: 55,
      });
    });

    expect(mockFetchByLine).toHaveBeenCalledWith({ variables: { lineId: 55 } });
    const stationSetter = mockSetStationState.mock.calls[0][0];
    const result = stationSetter({ stations: [] } as any);
    expect(result.selectedDirection).toBe<LineDirection>('OUTBOUND');
    expect(result.selectedBound?.groupId).toBe(5);
  });

  it('駅が見つからなければ state を変更しない', async () => {
    const { mockSetStationState, mockSetNavigationState, mockSetLineState } =
      setupMolecules();
    const { mockFetchByGroup, mockFetchByLine } = setupQueries();
    mockFetchByGroup.mockResolvedValue({ data: { lineGroupStations: [] } });
    mockFetchByLine.mockResolvedValue({ data: { lineStations: [] } });

    let hook: HookResult = null;
    render(<HookBridge onReady={(value) => (hook = value)} />);

    await act(async () => {
      await hook?.openLink({
        stationGroupId: 99,
        direction: 0,
        lineGroupId: 1,
        lineId: undefined,
      });
      await hook?.openLink({
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
      lineError: null,
    });

    let hook: HookResult = null;
    render(<HookBridge onReady={(value) => (hook = value)} />);

    expect(hook?.isLoading).toBe(true);
    expect(hook?.error?.message).toBe('group');
  });
});
