import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import type React from 'react';
import type { Line, Station, TrainType } from '~/@types/graphql';
import { gqlRequest } from '~/lib/gql';
import { createLine, createStation } from '~/utils/test/factories';
import { selectedLineAtom } from '../store/atoms/line';
import { leftStationsAtom } from '../store/atoms/navigation';
import {
  selectedBoundAtom,
  selectedDirectionAtom,
  stationsAtom,
} from '../store/atoms/station';
import { useCurrentTrainType } from './useCurrentTrainType';
import { useDisplayCurrentStation } from './useDisplayCurrentStation';
import { useEstimateArrivalTimes } from './useEstimateArrivalTimes';
import { useLoopLine } from './useLoopLine';

jest.mock('jotai', () => ({
  __esModule: true,
  useAtomValue: jest.fn(),
  atom: jest.fn(),
}));
jest.mock('../store/atoms/station', () => ({
  __esModule: true,
  stationsAtom: { __atom: 'stations' },
  selectedBoundAtom: { __atom: 'selectedBound' },
  selectedDirectionAtom: { __atom: 'selectedDirection' },
}));
jest.mock('../store/atoms/line', () => ({
  __esModule: true,
  selectedLineAtom: { __atom: 'selectedLine' },
}));
jest.mock('../store/atoms/navigation', () => ({
  __esModule: true,
  leftStationsAtom: { __atom: 'leftStations' },
}));
jest.mock('./useCurrentTrainType', () => ({
  useCurrentTrainType: jest.fn(),
}));
jest.mock('./useDisplayCurrentStation', () => ({
  useDisplayCurrentStation: jest.fn(),
}));
jest.mock('./useLoopLine', () => ({
  useLoopLine: jest.fn(),
}));
jest.mock('~/lib/gql', () => ({
  gqlRequest: jest.fn(),
  graphqlQueryKey: jest.fn((_document: unknown, variables?: object) => [
    'EstimateArrivalTimes',
    variables ?? null,
  ]),
}));

type HookResult = ReturnType<typeof useEstimateArrivalTimes> | null;

const HookBridge: React.FC<{ onReady: (v: HookResult) => void }> = ({
  onReady,
}) => {
  onReady(useEstimateArrivalTimes());
  return null;
};

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Number.POSITIVE_INFINITY,
        gcTime: Number.POSITIVE_INFINITY,
      },
    },
  });

const renderHook = () => {
  const hookRef: { current: HookResult } = { current: null };
  const utils = render(
    <QueryClientProvider client={createQueryClient()}>
      <HookBridge
        onReady={(v) => {
          hookRef.current = v;
        }}
      />
    </QueryClientProvider>
  );
  return { hookRef, ...utils };
};

describe('useEstimateArrivalTimes', () => {
  const mockUseAtomValue = useAtomValue as jest.MockedFunction<
    typeof useAtomValue
  >;
  const mockUseCurrentTrainType = useCurrentTrainType as jest.MockedFunction<
    typeof useCurrentTrainType
  >;
  const mockUseDisplayCurrentStation =
    useDisplayCurrentStation as jest.MockedFunction<
      typeof useDisplayCurrentStation
    >;
  const mockUseLoopLine = useLoopLine as jest.MockedFunction<
    typeof useLoopLine
  >;
  const mockGqlRequest = gqlRequest as unknown as jest.Mock;

  const stationA = createStation(1, { line: { id: 100 } });
  const stationB = createStation(2, { line: { id: 100 } });
  const stationC = createStation(3, { line: { id: 100 } });
  const selectedLine = createLine(100);

  const setupAtoms = ({
    stations = [stationA, stationB, stationC],
    selectedBound = stationC as Station | null,
    selectedDirection = 'INBOUND' as string | null,
    line = selectedLine as Line | null,
    leftStations = [stationA, stationB, stationC] as Station[],
  } = {}) => {
    mockUseAtomValue.mockImplementation((atom) => {
      if (atom === stationsAtom) return stations;
      if (atom === selectedBoundAtom) return selectedBound;
      if (atom === selectedDirectionAtom) return selectedDirection;
      if (atom === selectedLineAtom) return line;
      if (atom === leftStationsAtom) return leftStations;
      throw new Error('unknown atom');
    });
  };

  beforeEach(() => {
    setupAtoms();
    mockUseCurrentTrainType.mockReturnValue(null);
    mockUseDisplayCurrentStation.mockReturnValue(stationA);
    mockUseLoopLine.mockReturnValue({
      isLoopLine: false,
    } as ReturnType<typeof useLoopLine>);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('selectedBound が null のときクエリを skip する', () => {
    setupAtoms({ selectedBound: null });
    mockUseCurrentTrainType.mockReturnValue(null);

    const { hookRef } = renderHook();

    expect(mockGqlRequest).not.toHaveBeenCalled();
    expect(hookRef.current?.route).toBeNull();
  });

  it('filteringId が null のときクエリを skip する', () => {
    setupAtoms({ line: null });
    mockUseCurrentTrainType.mockReturnValue(null);

    const { hookRef } = renderHook();

    expect(mockGqlRequest).not.toHaveBeenCalled();
    expect(hookRef.current?.route).toBeNull();
  });

  it('INBOUND のとき fromStationId=先頭, toStationId=末尾 で送信する', async () => {
    setupAtoms({ selectedDirection: 'INBOUND' });
    mockGqlRequest.mockResolvedValue({
      estimateArrivalTimes: {
        routes: [{ id: 100, stops: [] }],
      },
    });

    renderHook();

    await waitFor(() => {
      expect(mockGqlRequest).toHaveBeenCalled();
    });

    const variables = mockGqlRequest.mock.calls[0][1];
    expect(variables.fromStationId).toBe(stationA.id);
    expect(variables.toStationId).toBe(stationC.id);
  });

  it('OUTBOUND のとき fromStationId=末尾, toStationId=先頭 で送信する', async () => {
    setupAtoms({ selectedDirection: 'OUTBOUND' });
    mockGqlRequest.mockResolvedValue({
      estimateArrivalTimes: {
        routes: [{ id: 100, stops: [] }],
      },
    });

    renderHook();

    await waitFor(() => {
      expect(mockGqlRequest).toHaveBeenCalled();
    });

    const variables = mockGqlRequest.mock.calls[0][1];
    expect(variables.fromStationId).toBe(stationC.id);
    expect(variables.toStationId).toBe(stationA.id);
  });

  it('環状路線でないとき directionId を送信しない', async () => {
    mockGqlRequest.mockResolvedValue({
      estimateArrivalTimes: { routes: [] },
    });

    renderHook();

    await waitFor(() => {
      expect(mockGqlRequest).toHaveBeenCalled();
    });

    const variables = mockGqlRequest.mock.calls[0][1];
    expect(variables.directionId).toBeUndefined();
  });

  it('環状路線かつ INBOUND のとき directionId=0(格納順) を送信する', async () => {
    mockUseLoopLine.mockReturnValue({
      isLoopLine: true,
    } as ReturnType<typeof useLoopLine>);
    setupAtoms({ selectedDirection: 'INBOUND' });
    mockGqlRequest.mockResolvedValue({
      estimateArrivalTimes: { routes: [] },
    });

    renderHook();

    await waitFor(() => {
      expect(mockGqlRequest).toHaveBeenCalled();
    });

    const variables = mockGqlRequest.mock.calls[0][1];
    expect(variables.directionId).toBe(0);
  });

  it('環状路線かつ OUTBOUND のとき directionId=1(逆順) を送信する', async () => {
    mockUseLoopLine.mockReturnValue({
      isLoopLine: true,
    } as ReturnType<typeof useLoopLine>);
    setupAtoms({ selectedDirection: 'OUTBOUND' });
    mockGqlRequest.mockResolvedValue({
      estimateArrivalTimes: { routes: [] },
    });

    renderHook();

    await waitFor(() => {
      expect(mockGqlRequest).toHaveBeenCalled();
    });

    const variables = mockGqlRequest.mock.calls[0][1];
    expect(variables.directionId).toBe(1);
  });

  it('trainType.groupId でルートをフィルタリングする', async () => {
    mockUseCurrentTrainType.mockReturnValue({
      groupId: 42,
    } as TrainType);
    mockGqlRequest.mockResolvedValue({
      estimateArrivalTimes: {
        routes: [
          { id: 100, stops: [{ stationGroupId: 1, cumulativeMinutes: 0 }] },
          { id: 42, stops: [{ stationGroupId: 1, cumulativeMinutes: 5 }] },
        ],
      },
    });

    const { hookRef } = renderHook();

    await waitFor(() => {
      expect(hookRef.current?.route?.id).toBe(42);
    });
  });

  it('trainType が null のとき selectedLine.id でフィルタリングする', async () => {
    mockUseCurrentTrainType.mockReturnValue(null);
    mockGqlRequest.mockResolvedValue({
      estimateArrivalTimes: {
        routes: [
          { id: 100, stops: [{ stationGroupId: 1, cumulativeMinutes: 0 }] },
          { id: 999, stops: [{ stationGroupId: 1, cumulativeMinutes: 5 }] },
        ],
      },
    });

    const { hookRef } = renderHook();

    await waitFor(() => {
      expect(hookRef.current?.route?.id).toBe(100);
    });
  });

  it('一致するルートがないとき route は null', async () => {
    mockGqlRequest.mockResolvedValue({
      estimateArrivalTimes: {
        routes: [
          { id: 999, stops: [{ stationGroupId: 1, cumulativeMinutes: 0 }] },
        ],
      },
    });

    const { hookRef } = renderHook();

    await waitFor(() => {
      expect(hookRef.current?.loading).toBe(false);
    });
    expect(hookRef.current?.route).toBeNull();
  });

  it('leftStations に含まれない駅は stops から除外される', async () => {
    setupAtoms({ leftStations: [stationB, stationC] });
    mockGqlRequest.mockResolvedValue({
      estimateArrivalTimes: {
        routes: [
          {
            id: 100,
            stops: [
              { stationGroupId: stationA.groupId, cumulativeMinutes: 0 },
              { stationGroupId: stationB.groupId, cumulativeMinutes: 10 },
              { stationGroupId: stationC.groupId, cumulativeMinutes: 20 },
            ],
          },
        ],
      },
    });

    const { hookRef } = renderHook();

    await waitFor(() => {
      expect(hookRef.current?.route?.stops).toHaveLength(2);
    });
    expect(hookRef.current?.route?.stops?.map((s) => s.stationGroupId)).toEqual(
      [stationB.groupId, stationC.groupId]
    );
  });

  it('現在駅の出発時刻を基準(0分)とした相対値に変換する', async () => {
    mockUseDisplayCurrentStation.mockReturnValue(stationB);
    setupAtoms({ leftStations: [stationB, stationC] });
    mockGqlRequest.mockResolvedValue({
      estimateArrivalTimes: {
        routes: [
          {
            id: 100,
            stops: [
              { stationGroupId: stationA.groupId, cumulativeMinutes: 0 },
              {
                stationGroupId: stationB.groupId,
                cumulativeMinutes: 10,
                departureCumulativeMinutes: 10,
              },
              { stationGroupId: stationC.groupId, cumulativeMinutes: 22.5 },
            ],
          },
        ],
      },
    });

    const { hookRef } = renderHook();

    await waitFor(() => {
      expect(hookRef.current?.route?.stops).toHaveLength(1);
    });
    expect(hookRef.current?.route?.stops?.[0]?.stationGroupId).toBe(
      stationC.groupId
    );
    expect(hookRef.current?.route?.stops?.[0]?.cumulativeMinutes).toBe(12.5);
  });

  it('現在駅自身（0分）とそれより前（マイナス値）の stop は除外される', async () => {
    mockUseDisplayCurrentStation.mockReturnValue(stationB);
    setupAtoms({ leftStations: [stationA, stationB, stationC] });
    mockGqlRequest.mockResolvedValue({
      estimateArrivalTimes: {
        routes: [
          {
            id: 100,
            stops: [
              { stationGroupId: stationA.groupId, cumulativeMinutes: 0 },
              { stationGroupId: stationB.groupId, cumulativeMinutes: 10 },
              { stationGroupId: stationC.groupId, cumulativeMinutes: 22.5 },
            ],
          },
        ],
      },
    });

    const { hookRef } = renderHook();

    await waitFor(() => {
      expect(hookRef.current?.route?.stops).toHaveLength(1);
    });
    expect(hookRef.current?.route?.stops?.map((s) => s.stationGroupId)).toEqual(
      [stationC.groupId]
    );
  });

  it('環状路線で同じ駅(都庁前)が2回出現しても現在地に近い出現を基準にする', async () => {
    // 大江戸線: 都庁前が全stops中に2回出現するケース。
    // 1回目(cumulativeMinutes=1.0)は現在地と無関係な別区間の出現、
    // 2回目(cumulativeMinutes=56.2)が実際に現在地として使うべき出現。
    const tochomae = createStation(900, { line: { id: 100 } });
    mockUseDisplayCurrentStation.mockReturnValue(tochomae);
    setupAtoms({ leftStations: [tochomae, stationA, stationB] });
    mockGqlRequest.mockResolvedValue({
      estimateArrivalTimes: {
        routes: [
          {
            id: 100,
            stops: [
              { stationGroupId: tochomae.groupId, cumulativeMinutes: 1.0 },
              { stationGroupId: stationC.groupId, cumulativeMinutes: 30 },
              {
                stationGroupId: tochomae.groupId,
                cumulativeMinutes: 56.2,
                departureCumulativeMinutes: 56.2,
              },
              { stationGroupId: stationA.groupId, cumulativeMinutes: 58.0 },
              { stationGroupId: stationB.groupId, cumulativeMinutes: 59.9 },
            ],
          },
        ],
      },
    });

    const { hookRef } = renderHook();

    await waitFor(() => {
      expect(hookRef.current?.route?.stops).toHaveLength(2);
    });
    expect(hookRef.current?.route?.stops?.map((s) => s.stationGroupId)).toEqual(
      [stationA.groupId, stationB.groupId]
    );
    expect(hookRef.current?.route?.stops?.[0]?.cumulativeMinutes).toBeCloseTo(
      1.8
    );
    expect(hookRef.current?.route?.stops?.[1]?.cumulativeMinutes).toBeCloseTo(
      3.7
    );
  });

  it('viaLineIds に全路線IDが重複なく含まれる', async () => {
    const s1 = createStation(10, { line: { id: 200 } });
    const s2 = createStation(20, { line: { id: 200 } });
    const s3 = createStation(30, { line: { id: 300 } });
    setupAtoms({ stations: [s1, s2, s3], line: createLine(200) });
    mockGqlRequest.mockResolvedValue({
      estimateArrivalTimes: { routes: [] },
    });

    renderHook();

    await waitFor(() => {
      expect(mockGqlRequest).toHaveBeenCalled();
    });

    const variables = mockGqlRequest.mock.calls[0][1];
    expect(variables.viaLineIds).toEqual(expect.arrayContaining([200, 300]));
    expect(variables.viaLineIds).toHaveLength(2);
  });
});
