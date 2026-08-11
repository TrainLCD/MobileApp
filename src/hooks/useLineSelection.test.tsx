import { act, render } from '@testing-library/react-native';
import { useAtomValue, useSetAtom } from 'jotai';
import type React from 'react';
import type { Line, TrainType } from '~/@types/graphql';
import { TransportType } from '~/@types/graphql';
import { createLine, createStation } from '~/utils/test/factories';
import type { LineState } from '../store/atoms/line';
import type { NavigationState } from '../store/atoms/navigation';
import type { StationState } from '../store/atoms/station';
import { useLazyGraphQLQuery } from './useLazyGraphQLQuery';
import {
  type UseLineSelectionResult,
  useLineSelection,
} from './useLineSelection';

jest.mock('./useLazyGraphQLQuery', () => ({
  useLazyGraphQLQuery: jest.fn(),
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
  pendingQuickActionRouteId: null,
  ...overrides,
});

const createLineState = (overrides: Partial<LineState> = {}): LineState => ({
  selectedLine: null,
  pendingLine: null,
  ...overrides,
});

describe('useLineSelection', () => {
  const mockUseLazyQuery = useLazyGraphQLQuery as unknown as jest.Mock;
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

    // useLazyGraphQLQuery は GET_LINE_STATIONS, GET_LINE_GROUP_STATIONS, GET_STATION_TRAIN_TYPES_LIGHT の順
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

  it('バス路線で hasTrainTypes の場合に最初の列車種別を自動選択し lineGroup の駅を取得する', async () => {
    const { mockSetStationState, mockSetNavigationState } = setupMolecules();
    const { mockFetchByLineId, mockFetchByGroupId, mockFetchTrainTypes } =
      setupQueries();

    // 路線駅一覧（station.trainType は無い: バスは station 単位で trainType を持たない）
    const lineStations = [createStation(10), createStation(20)];
    mockFetchByLineId.mockResolvedValue({
      data: { lineStations },
    });

    // 自動選択される最初の列車種別と、その lineGroup の駅一覧
    const trainTypes = [
      { id: 1, groupId: 500, name: 'A系統' } as TrainType,
      { id: 2, groupId: 501, name: 'B系統' } as TrainType,
    ];
    mockFetchTrainTypes.mockResolvedValue({
      data: { stationTrainTypes: trainTypes },
    });
    const groupStations = [createStation(10), createStation(30)];
    mockFetchByGroupId.mockResolvedValue({
      data: { lineGroupStations: groupStations },
    });

    const line = createLine(100, {
      transportType: TransportType.Bus,
      station: { id: 10, hasTrainTypes: true } as Line['station'],
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

    // 最初の列車種別の groupId で駅一覧を取得している
    expect(mockFetchByGroupId).toHaveBeenCalledWith({
      variables: { lineGroupId: 500 },
    });

    // navigationState の更新で pendingTrainType が先頭の列車種別に設定されている
    const navSetterCalls = mockSetNavigationState.mock.calls;
    const lastNavSetter = navSetterCalls[navSetterCalls.length - 1][0];
    const navResult = lastNavSetter(createNavigationState());
    expect(navResult.fetchedTrainTypes).toEqual(trainTypes);
    expect(navResult.pendingTrainType).toEqual(trainTypes[0]);

    // stationState の最後の更新で lineGroup の駅一覧に差し替わっている
    const stationSetterCalls = mockSetStationState.mock.calls;
    const lastStationSetter =
      stationSetterCalls[stationSetterCalls.length - 1][0];
    const stationResult = lastStationSetter(createStationState());
    expect(stationResult.pendingStations).toEqual(groupStations);
    expect(stationResult.pendingStation?.id).toBe(10);
  });

  it('鉄道路線で hasTrainTypes でも station.trainType が無ければ自動選択しない', async () => {
    const { mockSetNavigationState } = setupMolecules();
    const { mockFetchByLineId, mockFetchByGroupId, mockFetchTrainTypes } =
      setupQueries();

    const lineStations = [createStation(10)];
    mockFetchByLineId.mockResolvedValue({
      data: { lineStations },
    });
    const trainTypes = [{ id: 1, groupId: 500, name: '快速' } as TrainType];
    mockFetchTrainTypes.mockResolvedValue({
      data: { stationTrainTypes: trainTypes },
    });

    const line = createLine(100, {
      transportType: TransportType.Rail,
      station: { id: 10, hasTrainTypes: true } as Line['station'],
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

    // 鉄道は自動フォールバックしないので groupId 経由の駅取得は呼ばれない
    expect(mockFetchByGroupId).not.toHaveBeenCalled();

    const navSetterCalls = mockSetNavigationState.mock.calls;
    const lastNavSetter = navSetterCalls[navSetterCalls.length - 1][0];
    const navResult = lastNavSetter(createNavigationState());
    expect(navResult.pendingTrainType).toBeNull();
  });

  // 種別だけ設定して路線単独の駅一覧を残すと、プリセット復元時に使う
  // lineGroupStations と範囲が食い違い、始発駅・終着駅がずれる
  it('鉄道路線で station.trainType が指定されていれば lineGroup の駅一覧へ差し替える', async () => {
    const { mockSetStationState, mockSetNavigationState } = setupMolecules();
    const { mockFetchByLineId, mockFetchByGroupId, mockFetchTrainTypes } =
      setupQueries();

    // 路線単独の駅一覧（副都心線のみに相当）
    const lineStations = [
      createStation(10, { groupId: 100, trainType: { id: 1 } } as Parameters<
        typeof createStation
      >[1]),
      createStation(20),
    ];
    mockFetchByLineId.mockResolvedValue({
      data: { lineStations },
    });

    const trainTypes = [
      { id: 1, groupId: 500, name: '各駅停車' } as TrainType,
      { id: 2, groupId: 501, name: '急行' } as TrainType,
    ];
    mockFetchTrainTypes.mockResolvedValue({
      data: { stationTrainTypes: trainTypes },
    });

    // 直通を含む系統全体の駅一覧。
    // 直通系統では同じ駅でも駅IDが変わるため、駅ID 10 は含まれず groupId 100 で引き当てる
    const groupStations = [
      createStation(1),
      createStation(110, { groupId: 100 }),
      createStation(20),
      createStation(30),
    ];
    mockFetchByGroupId.mockResolvedValue({
      data: { lineGroupStations: groupStations },
    });

    const line = createLine(100, {
      transportType: TransportType.Rail,
      station: { id: 10, hasTrainTypes: true } as Line['station'],
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

    // 指定種別の groupId で駅一覧を取得している
    expect(mockFetchByGroupId).toHaveBeenCalledWith({
      variables: { lineGroupId: 500 },
    });

    const navSetterCalls = mockSetNavigationState.mock.calls;
    const lastNavSetter = navSetterCalls[navSetterCalls.length - 1][0];
    const navResult = lastNavSetter(createNavigationState());
    expect(navResult.pendingTrainType).toEqual(trainTypes[0]);

    const stationSetterCalls = mockSetStationState.mock.calls;
    const lastStationSetter =
      stationSetterCalls[stationSetterCalls.length - 1][0];
    const stationResult = lastStationSetter(createStationState());
    expect(stationResult.pendingStations).toEqual(groupStations);
    // 駅IDでは引き当てられないので groupId 一致の駅が選ばれる
    expect(stationResult.pendingStation?.id).toBe(110);
  });

  it('lineGroup の駅一覧が空なら路線単独の駅一覧を残す', async () => {
    const { mockSetStationState } = setupMolecules();
    const { mockFetchByLineId, mockFetchByGroupId, mockFetchTrainTypes } =
      setupQueries();

    const lineStations = [
      createStation(10, { trainType: { id: 1 } } as Parameters<
        typeof createStation
      >[1]),
      createStation(20),
    ];
    mockFetchByLineId.mockResolvedValue({
      data: { lineStations },
    });
    mockFetchTrainTypes.mockResolvedValue({
      data: {
        stationTrainTypes: [{ id: 1, groupId: 500, name: '各駅停車' }],
      },
    });
    mockFetchByGroupId.mockResolvedValue({
      data: { lineGroupStations: [] },
    });

    const line = createLine(100, {
      transportType: TransportType.Rail,
      station: { id: 10, hasTrainTypes: true } as Line['station'],
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

    const stationSetterCalls = mockSetStationState.mock.calls;
    const lastStationSetter =
      stationSetterCalls[stationSetterCalls.length - 1][0];
    const stationResult = lastStationSetter(createStationState());
    expect(stationResult.pendingStations).toEqual(lineStations);
  });

  // 路線を選び直したとき、前の選択の取得結果が新しい状態を上書きしてはいけない
  it('取得中に別の路線が選ばれたら古い系統駅一覧で上書きしない', async () => {
    const { mockSetStationState } = setupMolecules();
    const { mockFetchByLineId, mockFetchByGroupId, mockFetchTrainTypes } =
      setupQueries();

    const lineStationsA = [
      createStation(10, { trainType: { id: 1 } } as Parameters<
        typeof createStation
      >[1]),
    ];
    const lineStationsB = [
      createStation(20, { trainType: { id: 2 } } as Parameters<
        typeof createStation
      >[1]),
    ];
    // 呼び出し順ではなく引数で解決先を決める（A と B の実行が入れ替わっても壊れないように）
    mockFetchByLineId.mockImplementation(
      ({ variables }: { variables: { lineId: number } }) =>
        Promise.resolve({
          data: {
            lineStations:
              variables.lineId === 100 ? lineStationsA : lineStationsB,
          },
        })
    );

    mockFetchTrainTypes.mockResolvedValue({
      data: {
        stationTrainTypes: [
          { id: 1, groupId: 500, name: 'A' },
          { id: 2, groupId: 600, name: 'B' },
        ],
      },
    });

    const groupStationsA = [createStation(910)];
    const groupStationsB = [createStation(920)];
    let resolveGroupA: ((value: unknown) => void) | undefined;
    mockFetchByGroupId.mockImplementation(
      ({ variables }: { variables: { lineGroupId: number } }) => {
        if (variables.lineGroupId === 500) {
          return new Promise((resolve) => {
            resolveGroupA = resolve;
          });
        }
        return Promise.resolve({
          data: { lineGroupStations: groupStationsB },
        });
      }
    );

    const lineA = createLine(100, {
      transportType: TransportType.Rail,
      station: { id: 10, hasTrainTypes: true } as Line['station'],
    });
    const lineB = createLine(200, {
      transportType: TransportType.Rail,
      station: { id: 20, hasTrainTypes: true } as Line['station'],
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
      // A を系統駅一覧の取得待ちまで進める
      const pendingA = hookRef.current?.handleLineSelected(lineA);
      await new Promise((r) => setTimeout(r, 0));
      expect(resolveGroupA).toBeDefined();

      // A が系統駅一覧を待っている間に B を選び直す
      await hookRef.current?.handleLineSelected(lineB);

      // 後から A の応答が返る
      resolveGroupA?.({ data: { lineGroupStations: groupStationsA } });
      await pendingA;
    });

    const stationSetterCalls = mockSetStationState.mock.calls;
    const lastStationSetter =
      stationSetterCalls[stationSetterCalls.length - 1][0];
    const stationResult = lastStationSetter(createStationState());
    expect(stationResult.pendingStations).toEqual(groupStationsB);
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
