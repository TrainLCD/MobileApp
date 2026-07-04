import { renderHook } from '@testing-library/react-native';
import { useEstimatedMinutesByStationId } from './useEstimatedMinutesByStationId';

type EstimatedRoute = Parameters<typeof useEstimatedMinutesByStationId>[0];

describe('useEstimatedMinutesByStationId', () => {
  it('stationIdをキーにcumulativeMinutesのMapを返す', () => {
    const estimatedRoute = {
      id: 1,
      stops: [
        { stationId: 10, cumulativeMinutes: 3 },
        { stationId: 20, cumulativeMinutes: 7 },
      ],
    } as unknown as EstimatedRoute;

    const { result } = renderHook(() =>
      useEstimatedMinutesByStationId(estimatedRoute)
    );

    expect(result.current.get(10)).toBe(3);
    expect(result.current.get(20)).toBe(7);
    expect(result.current.size).toBe(2);
  });

  it('stationIdがnullのstopは除外する', () => {
    const estimatedRoute = {
      id: 1,
      stops: [
        { stationId: null, cumulativeMinutes: 3 },
        { stationId: 20, cumulativeMinutes: 7 },
      ],
    } as unknown as EstimatedRoute;

    const { result } = renderHook(() =>
      useEstimatedMinutesByStationId(estimatedRoute)
    );

    expect(result.current.size).toBe(1);
    expect(result.current.get(20)).toBe(7);
  });

  it('estimatedRouteがnullの場合、空のMapを返す', () => {
    const { result } = renderHook(() => useEstimatedMinutesByStationId(null));

    expect(result.current.size).toBe(0);
  });

  it('estimatedRoute.stopsがundefinedの場合、空のMapを返す', () => {
    const estimatedRoute = { id: 1 } as unknown as EstimatedRoute;

    const { result } = renderHook(() =>
      useEstimatedMinutesByStationId(estimatedRoute)
    );

    expect(result.current.size).toBe(0);
  });
});
