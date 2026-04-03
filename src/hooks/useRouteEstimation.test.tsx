import { useLazyQuery } from '@apollo/client/react';
import { act, render } from '@testing-library/react-native';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import type React from 'react';
import type { RouteEstimationState } from '~/store/atoms/routeEstimation';
import type {
  EstimationResult,
  RouteCandidate,
} from '~/utils/routeEstimation/types';
import { createLine, createStation } from '~/utils/test/factories';
import {
  useRouteEstimation,
  useRouteEstimationControl,
} from './useRouteEstimation';

jest.mock('@apollo/client/react', () => ({
  useLazyQuery: jest.fn(),
}));
jest.mock('jotai', () => ({
  useAtom: jest.fn(),
  useAtomValue: jest.fn(),
  useSetAtom: jest.fn(),
  atom: jest.fn(),
}));
jest.mock('~/utils/routeEstimation/estimateRoute', () => ({
  estimateRoutes: jest.fn(() => []),
}));
jest.mock('~/utils/routeEstimation/preprocessLogs', () => ({
  appendToBuffer: jest.fn((_buf, log) => [..._buf, log]),
  preprocessLogs: jest.fn((buf) => buf),
  getTotalDistance: jest.fn(() => 0),
  getAvgSpeed: jest.fn(() => 0),
  isMoving: jest.fn(() => false),
  isTransferStop: jest.fn(() => false),
  MIN_POINTS_FOR_ESTIMATION: 5,
}));

const mockUseLazyQuery = useLazyQuery as unknown as jest.Mock;
const mockUseAtom = useAtom as unknown as jest.Mock;
const mockUseAtomValue = useAtomValue as unknown as jest.Mock;
const mockUseSetAtom = useSetAtom as unknown as jest.Mock;

type HookResult = EstimationResult | null;

const HookBridge: React.FC<{ onReady: (value: HookResult) => void }> = ({
  onReady,
}) => {
  onReady(useRouteEstimation());
  return null;
};

type ControlResult = ReturnType<typeof useRouteEstimationControl> | null;

const ControlHookBridge: React.FC<{
  onReady: (value: ControlResult) => void;
}> = ({ onReady }) => {
  onReady(useRouteEstimationControl());
  return null;
};

const createRouteEstimationState = (
  overrides: Partial<RouteEstimationState> = {}
): RouteEstimationState => ({
  status: 'idle',
  candidates: [],
  locationBuffer: [],
  isEstimating: false,
  ...overrides,
});

const setupAtoms = (stateOverrides: Partial<RouteEstimationState> = {}) => {
  const state = createRouteEstimationState(stateOverrides);
  const mockSetState = jest.fn();
  const mockSetLineState = jest.fn();
  const mockSetStationState = jest.fn();

  // useAtomValue(locationAtom) → null
  mockUseAtomValue.mockReturnValue(null);

  // useAtom(routeEstimationState)
  mockUseAtom.mockReturnValue([state, mockSetState]);

  // useSetAtom: lineState, stationState の順
  const setters = [mockSetLineState, mockSetStationState];
  let setterIndex = 0;
  mockUseSetAtom.mockImplementation(() => {
    const setter = setters[setterIndex % setters.length];
    setterIndex++;
    return setter;
  });

  return { state, mockSetState, mockSetLineState, mockSetStationState };
};

const setupQueries = () => {
  const mockFetchNearbyStart = jest.fn();
  const mockFetchNearbyEnd = jest.fn();
  const mockFetchLineListStations = jest.fn();

  const queryResults = [
    [mockFetchNearbyStart],
    [mockFetchNearbyEnd],
    [mockFetchLineListStations],
  ];
  let queryIndex = 0;
  mockUseLazyQuery.mockImplementation(() => {
    const result = queryResults[queryIndex % queryResults.length];
    queryIndex++;
    return result;
  });

  return {
    mockFetchNearbyStart,
    mockFetchNearbyEnd,
    mockFetchLineListStations,
  };
};

describe('useRouteEstimation', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('初期状態で idle を返す', () => {
    setupAtoms();
    setupQueries();

    const hookRef: { current: HookResult } = { current: null };
    render(
      <HookBridge
        onReady={(v) => {
          hookRef.current = v;
        }}
      />
    );

    expect(hookRef.current?.status).toBe('idle');
    expect(hookRef.current?.candidates).toEqual([]);
    expect(hookRef.current?.bufferInfo).toEqual({
      pointCount: 0,
      totalDistance: 0,
      avgSpeed: 0,
      isMoving: false,
    });
  });

  it('selectCandidate が lineState と stationState を更新し推定を停止する', () => {
    const { mockSetState, mockSetLineState, mockSetStationState } = setupAtoms({
      isEstimating: true,
      status: 'ready',
    });
    setupQueries();

    const line = createLine(100);
    const stations = [
      createStation(1, { line: { id: 100 } }),
      createStation(2, { line: { id: 100 } }),
    ];
    const candidate: RouteCandidate = {
      line,
      direction: 'INBOUND',
      currentStation: stations[0],
      nextStation: stations[1],
      boundStation: stations[1],
      stations,
      score: 0.9,
      confidence: 0.85,
      scoreBreakdown: { routeFitScore: 0.9, orderScore: 0.9, speedScore: 0.9 },
    };

    const hookRef: { current: HookResult } = { current: null };
    render(
      <HookBridge
        onReady={(v) => {
          hookRef.current = v;
        }}
      />
    );

    act(() => {
      hookRef.current?.selectCandidate(candidate);
    });

    // lineState 更新
    expect(mockSetLineState).toHaveBeenCalled();
    const lineSetter = mockSetLineState.mock.calls[0][0];
    const lineResult = lineSetter({ selectedLine: null, pendingLine: null });
    expect(lineResult.selectedLine).toBe(line);

    // stationState 更新
    expect(mockSetStationState).toHaveBeenCalled();
    const stationSetter = mockSetStationState.mock.calls[0][0];
    const stationResult = stationSetter({
      station: null,
      stations: [],
      selectedDirection: null,
      selectedBound: null,
    });
    expect(stationResult.station).toBe(stations[0]);
    expect(stationResult.stations).toBe(stations);
    expect(stationResult.selectedDirection).toBe('INBOUND');
    expect(stationResult.selectedBound).toBe(stations[1]);

    // 推定状態リセット
    expect(mockSetState).toHaveBeenCalled();
    const stateSetter = mockSetState.mock.calls[0][0];
    const stateResult = stateSetter(
      createRouteEstimationState({ isEstimating: true, status: 'ready' })
    );
    expect(stateResult.isEstimating).toBe(false);
    expect(stateResult.locationBuffer).toEqual([]);
    expect(stateResult.candidates).toEqual([]);
    expect(stateResult.status).toBe('idle');
  });

  it('reset が状態を初期化する', () => {
    const { mockSetState } = setupAtoms({
      isEstimating: true,
      status: 'estimating',
      locationBuffer: [
        {
          latitude: 35.68,
          longitude: 139.76,
          accuracy: 10,
          timestamp: 1000,
          speed: 5,
        },
      ],
    });
    setupQueries();

    const hookRef: { current: HookResult } = { current: null };
    render(
      <HookBridge
        onReady={(v) => {
          hookRef.current = v;
        }}
      />
    );

    act(() => {
      hookRef.current?.reset();
    });

    expect(mockSetState).toHaveBeenCalledWith({
      status: 'idle',
      candidates: [],
      locationBuffer: [],
      isEstimating: false,
    });
  });

  it('bufferInfo がバッファの統計情報を返す', () => {
    const { preprocessLogs, getTotalDistance, getAvgSpeed, isMoving } =
      jest.requireMock('~/utils/routeEstimation/preprocessLogs');

    const buffer = [
      {
        latitude: 35.68,
        longitude: 139.76,
        accuracy: 10,
        timestamp: 1000,
        speed: 15,
      },
      {
        latitude: 35.69,
        longitude: 139.77,
        accuracy: 10,
        timestamp: 2000,
        speed: 15,
      },
    ];

    preprocessLogs.mockReturnValue(buffer);
    getTotalDistance.mockReturnValue(500);
    getAvgSpeed.mockReturnValue(12);
    isMoving.mockReturnValue(true);

    setupAtoms({ locationBuffer: buffer });
    setupQueries();

    const hookRef: { current: HookResult } = { current: null };
    render(
      <HookBridge
        onReady={(v) => {
          hookRef.current = v;
        }}
      />
    );

    expect(hookRef.current?.bufferInfo).toEqual({
      pointCount: 2,
      totalDistance: 500,
      avgSpeed: 12,
      isMoving: true,
    });
  });
});

describe('useRouteEstimationControl', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const setupControlAtoms = (
    stateOverrides: Partial<RouteEstimationState> = {}
  ) => {
    const state = createRouteEstimationState(stateOverrides);
    const mockSetState = jest.fn();
    mockUseAtom.mockReturnValue([state, mockSetState]);
    return { state, mockSetState };
  };

  it('isEstimating が初期状態で false を返す', () => {
    setupControlAtoms();

    const hookRef: { current: ControlResult } = { current: null };
    render(
      <ControlHookBridge
        onReady={(v) => {
          hookRef.current = v;
        }}
      />
    );

    expect(hookRef.current?.isEstimating).toBe(false);
  });

  it('startEstimation が isEstimating を true に、status を collecting にする', () => {
    const { mockSetState } = setupControlAtoms();

    const hookRef: { current: ControlResult } = { current: null };
    render(
      <ControlHookBridge
        onReady={(v) => {
          hookRef.current = v;
        }}
      />
    );

    act(() => {
      hookRef.current?.startEstimation();
    });

    expect(mockSetState).toHaveBeenCalled();
    const setter = mockSetState.mock.calls[0][0];
    const result = setter(createRouteEstimationState());
    expect(result.isEstimating).toBe(true);
    expect(result.status).toBe('collecting');
  });

  it('stopEstimation が isEstimating を false に、status を idle にする', () => {
    const { mockSetState } = setupControlAtoms({
      isEstimating: true,
      status: 'estimating',
    });

    const hookRef: { current: ControlResult } = { current: null };
    render(
      <ControlHookBridge
        onReady={(v) => {
          hookRef.current = v;
        }}
      />
    );

    act(() => {
      hookRef.current?.stopEstimation();
    });

    expect(mockSetState).toHaveBeenCalled();
    const setter = mockSetState.mock.calls[0][0];
    const result = setter(
      createRouteEstimationState({ isEstimating: true, status: 'estimating' })
    );
    expect(result.isEstimating).toBe(false);
    expect(result.status).toBe('idle');
  });
});
