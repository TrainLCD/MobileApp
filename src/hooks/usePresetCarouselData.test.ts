import { act, renderHook } from '@testing-library/react-native';
import { gqlClient } from '~/lib/gql';
import type { SavedRoute } from '~/models/SavedRoute';
import { createStation } from '~/utils/test/factories';
import { usePresetCarouselData } from './usePresetCarouselData';
import { useSavedRoutes } from './useSavedRoutes';

jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(() => ({
    execAsync: jest.fn(),
    getAllAsync: jest.fn().mockResolvedValue([]),
    runAsync: jest.fn(),
  })),
}));

jest.mock('~/lib/gql', () => ({
  gqlClient: { query: jest.fn() },
}));

jest.mock('~/lib/graphql/queries', () => ({
  GET_LINE_LIST_STATIONS_PRESET: 'GET_LINE_LIST_STATIONS_PRESET',
  GET_LINE_GROUP_LIST_STATIONS_PRESET: 'GET_LINE_GROUP_LIST_STATIONS_PRESET',
}));

jest.mock('./useSavedRoutes');

const createLineRoute = (id: string, lineId: number): SavedRoute => ({
  id,
  name: `Route ${lineId}`,
  lineId,
  trainTypeId: null,
  hasTrainType: false,
  createdAt: new Date('2024-01-01'),
});

const createTrainTypeRoute = (
  id: string,
  lineId: number,
  trainTypeId: number
): SavedRoute => ({
  id,
  name: `Route ${trainTypeId}`,
  lineId,
  trainTypeId,
  hasTrainType: true,
  createdAt: new Date('2024-01-01'),
});

describe('usePresetCarouselData', () => {
  const mockUpdateRoutes = jest.fn();
  const mockQuery = gqlClient.query as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    (useSavedRoutes as jest.Mock).mockReturnValue({
      routes: [],
      updateRoutes: mockUpdateRoutes,
      isInitialized: false,
    });
  });

  it('DB が初期化されるまで updateRoutes を呼ばない', () => {
    renderHook(() => usePresetCarouselData());

    expect(mockUpdateRoutes).not.toHaveBeenCalled();
  });

  it('DB 初期化後に updateRoutes を呼ぶ', () => {
    (useSavedRoutes as jest.Mock).mockReturnValue({
      routes: [],
      updateRoutes: mockUpdateRoutes,
      isInitialized: true,
    });

    renderHook(() => usePresetCarouselData());

    expect(mockUpdateRoutes).toHaveBeenCalled();
  });

  it('lineRoute のみの場合、lineListStations で駅を取得する', async () => {
    const route = createLineRoute('uuid-1', 100);
    const stations = [
      createStation(10, { line: { id: 100 } }),
      createStation(11, { line: { id: 100 } }),
    ];

    mockQuery.mockResolvedValue({
      data: { lineListStations: stations },
    });

    (useSavedRoutes as jest.Mock).mockReturnValue({
      routes: [route],
      updateRoutes: mockUpdateRoutes,
      isInitialized: true,
    });

    const { result } = renderHook(() => usePresetCarouselData());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(mockQuery).toHaveBeenCalledWith({
      query: 'GET_LINE_LIST_STATIONS_PRESET',
      variables: { lineIds: [100] },
    });
    expect(result.current.carouselData).toHaveLength(1);
    expect(result.current.carouselData[0].stations).toEqual(stations);
    expect(result.current.carouselData[0].__k).toBe('uuid-1-0');
  });

  it('trainTypeRoute の場合、lineGroupListStations で駅を取得する', async () => {
    const route = createTrainTypeRoute('uuid-2', 200, 300);
    const stations = [
      createStation(20, { trainType: { groupId: 300 } } as Parameters<
        typeof createStation
      >[1]),
    ];

    mockQuery.mockResolvedValue({
      data: { lineGroupListStations: stations },
    });

    (useSavedRoutes as jest.Mock).mockReturnValue({
      routes: [route],
      updateRoutes: mockUpdateRoutes,
      isInitialized: true,
    });

    const { result } = renderHook(() => usePresetCarouselData());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(mockQuery).toHaveBeenCalledWith({
      query: 'GET_LINE_GROUP_LIST_STATIONS_PRESET',
      variables: { lineGroupIds: [300] },
    });
    expect(result.current.carouselData).toHaveLength(1);
    expect(result.current.carouselData[0].stations).toEqual(stations);
  });

  it('同一 routes key の場合は再取得しない', async () => {
    const route = createLineRoute('uuid-1', 100);
    const stations = [createStation(10, { line: { id: 100 } })];

    mockQuery.mockResolvedValue({
      data: { lineListStations: stations },
    });

    (useSavedRoutes as jest.Mock).mockReturnValue({
      routes: [route],
      updateRoutes: mockUpdateRoutes,
      isInitialized: true,
    });

    const { rerender } = renderHook(() => usePresetCarouselData());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    rerender({});

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    // 同じ routes なので query は1回のみ
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });
});
