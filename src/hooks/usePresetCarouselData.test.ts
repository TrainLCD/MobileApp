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
  wantedDestinationId: null,
  direction: null,
  notifyStationIds: [],
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
  wantedDestinationId: null,
  direction: null,
  notifyStationIds: [],
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

  // 取得中に updateRoutes() などで routes が作り直されると、
  // 表示のみの更新として既存 carouselData から駅を引き当てようとして空になっていた
  it('取得中に routes が作り直されても駅データを取りこぼさない', async () => {
    const route = createLineRoute('uuid-1', 100);
    const stations = [createStation(10, { line: { id: 100 } })];

    let resolveQuery: (value: unknown) => void = () => {};
    mockQuery.mockReturnValue(
      new Promise((resolve) => {
        resolveQuery = resolve;
      })
    );

    (useSavedRoutes as jest.Mock).mockReturnValue({
      routes: [route],
      updateRoutes: mockUpdateRoutes,
      isInitialized: true,
    });

    const { result, rerender } = renderHook(() => usePresetCarouselData());

    // 取得完了前に DB から読み直され、内容は同じだが配列・要素の同一性だけが変わる
    (useSavedRoutes as jest.Mock).mockReturnValue({
      routes: [{ ...route }],
      updateRoutes: mockUpdateRoutes,
      isInitialized: true,
    });
    await act(async () => {
      rerender({});
    });

    await act(async () => {
      resolveQuery({ data: { lineListStations: stations } });
      await new Promise((r) => setTimeout(r, 0));
    });

    // 同じ取得対象なので取得は1回だけで、進行中のリクエストは差し替えられない
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(result.current.carouselData).toHaveLength(1);
    expect(result.current.carouselData[0].stations).toEqual(stations);
  });

  // 新規保存したプリセットだけ駅が空のまま固定されるのを防ぐ
  it('取得中に新しいプリセットが増えた場合も全件の駅データが揃う', async () => {
    const existing = createLineRoute('uuid-1', 100);
    const added = createLineRoute('uuid-2', 200);
    const existingStations = [createStation(10, { line: { id: 100 } })];
    const addedStations = [createStation(20, { line: { id: 200 } })];

    mockQuery.mockResolvedValue({
      data: { lineListStations: existingStations },
    });

    (useSavedRoutes as jest.Mock).mockReturnValue({
      routes: [existing],
      updateRoutes: mockUpdateRoutes,
      isInitialized: true,
    });

    const { result, rerender } = renderHook(() => usePresetCarouselData());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    // プリセット保存直後: 取得が完了する前に routes が作り直される
    let resolveQuery: (value: unknown) => void = () => {};
    mockQuery.mockReturnValue(
      new Promise((resolve) => {
        resolveQuery = resolve;
      })
    );
    (useSavedRoutes as jest.Mock).mockReturnValue({
      routes: [added, existing],
      updateRoutes: mockUpdateRoutes,
      isInitialized: true,
    });
    await act(async () => {
      rerender({});
    });

    (useSavedRoutes as jest.Mock).mockReturnValue({
      routes: [{ ...added }, { ...existing }],
      updateRoutes: mockUpdateRoutes,
      isInitialized: true,
    });
    await act(async () => {
      rerender({});
    });

    await act(async () => {
      resolveQuery({
        data: { lineListStations: [...addedStations, ...existingStations] },
      });
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.carouselData).toHaveLength(2);
    expect(result.current.carouselData[0].stations).toEqual(addedStations);
    expect(result.current.carouselData[1].stations).toEqual(existingStations);
  });

  // 追い越された古い応答が共有キャッシュを上書きすると、
  // 以降の表示更新で古い駅データが使われてしまう
  it('新しい応答を追い越した古い応答でキャッシュを上書きしない', async () => {
    const routeA = createLineRoute('uuid-1', 100);
    const routeB = createLineRoute('uuid-2', 200);
    const staleStations = [createStation(1, { line: { id: 100 } })];
    const freshStations = [
      createStation(10, { line: { id: 100 } }),
      createStation(11, { line: { id: 100 } }),
    ];
    const stationsB = [createStation(20, { line: { id: 200 } })];

    let resolveOld: (value: unknown) => void = () => {};
    let resolveNew: (value: unknown) => void = () => {};
    mockQuery
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveOld = resolve;
        })
      )
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveNew = resolve;
        })
      );

    (useSavedRoutes as jest.Mock).mockReturnValue({
      routes: [routeA],
      updateRoutes: mockUpdateRoutes,
      isInitialized: true,
    });

    const { result, rerender } = renderHook(() => usePresetCarouselData());

    // 取得対象が変わるので新しいリクエストが発行される
    (useSavedRoutes as jest.Mock).mockReturnValue({
      routes: [routeA, routeB],
      updateRoutes: mockUpdateRoutes,
      isInitialized: true,
    });
    await act(async () => {
      rerender({});
    });

    // 新しい応答が先に、古い応答が後から返る
    await act(async () => {
      resolveNew({
        data: { lineListStations: [...freshStations, ...stationsB] },
      });
      await new Promise((r) => setTimeout(r, 0));
    });
    await act(async () => {
      resolveOld({ data: { lineListStations: staleStations } });
      await new Promise((r) => setTimeout(r, 0));
    });

    // 表示項目だけの更新でキャッシュから再構築させる
    (useSavedRoutes as jest.Mock).mockReturnValue({
      routes: [{ ...routeA, name: 'renamed' }, routeB],
      updateRoutes: mockUpdateRoutes,
      isInitialized: true,
    });
    await act(async () => {
      rerender({});
    });

    expect(result.current.carouselData[0].stations).toEqual(freshStations);
    expect(result.current.carouselData[1].stations).toEqual(stationsB);
  });
});
