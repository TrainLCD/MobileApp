import { renderHook } from '@testing-library/react-native';
import { useDisplayCurrentStation } from './useDisplayCurrentStation';
import { useEstimateArrivalTimesAllStops } from './useEstimateArrivalTimesAllStops';
import { useEstimateArrivalTimesRoute } from './useEstimateArrivalTimesRoute';

jest.mock('./useDisplayCurrentStation', () => ({
  useDisplayCurrentStation: jest.fn(),
}));
jest.mock('./useEstimateArrivalTimesRoute', () => ({
  useEstimateArrivalTimesRoute: jest.fn(),
}));

const mockedUseDisplayCurrentStation = useDisplayCurrentStation as jest.Mock;
const mockedUseEstimateArrivalTimesRoute =
  useEstimateArrivalTimesRoute as jest.Mock;

const setRoute = (route: unknown) => {
  mockedUseEstimateArrivalTimesRoute.mockReturnValue({
    route,
    loading: false,
    error: null,
  });
};

describe('useEstimateArrivalTimesAllStops', () => {
  beforeEach(() => {
    mockedUseDisplayCurrentStation.mockReturnValue({ id: 2 });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('ルートが無いときは null を返す', () => {
    setRoute(null);

    const { result } = renderHook(() => useEstimateArrivalTimesAllStops());

    expect(result.current.route).toBeNull();
  });

  it('leftStations で絞らず、全 stops を相対時間にして返す', () => {
    // 横画面 LineBoard に出ていない駅も落とさないことがこのフックの存在理由
    setRoute({
      id: 1,
      stops: [
        { stationId: 1, cumulativeMinutes: 0, departureCumulativeMinutes: 1 },
        { stationId: 2, cumulativeMinutes: 5, departureCumulativeMinutes: 6 },
        { stationId: 3, cumulativeMinutes: 12, departureCumulativeMinutes: 13 },
        { stationId: 4, cumulativeMinutes: 20, departureCumulativeMinutes: 21 },
        { stationId: 5, cumulativeMinutes: 31, departureCumulativeMinutes: 32 },
      ],
    });

    const { result } = renderHook(() => useEstimateArrivalTimesAllStops());

    expect(
      result.current.route?.stops.map((s) => [s.stationId, s.cumulativeMinutes])
    ).toEqual([
      [3, 6],
      [4, 14],
      [5, 25],
    ]);
  });

  it('ルートの他のフィールドはそのまま持ち越す', () => {
    setRoute({ id: 42, stops: [] });

    const { result } = renderHook(() => useEstimateArrivalTimesAllStops());

    expect(result.current.route?.id).toBe(42);
  });

  it('skip オプションをルート取得へそのまま渡す', () => {
    setRoute(null);

    renderHook(() => useEstimateArrivalTimesAllStops({ skip: true }));

    expect(mockedUseEstimateArrivalTimesRoute).toHaveBeenCalledWith({
      skip: true,
    });
  });
});
