import { act, renderHook, waitFor } from '@testing-library/react-native';
import { Provider as JotaiProvider } from 'jotai';
import { createStore } from 'jotai/vanilla';
import type { ReactNode } from 'react';
import {
  readSavedRoutes,
  SAVED_ROUTES_KEY,
  writeSavedRoutes,
} from '~/lib/savedRoutesStorage';
import { storage } from '~/lib/storage';
import type {
  SavedRoute,
  SavedRouteWithTrainTypeInput,
} from '~/models/SavedRoute';
import navigationState, {
  initialNavigationState,
} from '~/store/atoms/navigation';
import { useSavedRoutes } from './useSavedRoutes';

let mockIdCounter = 0;
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => {
    mockIdCounter += 1;
    return `550e8400-e29b-41d4-a716-${String(mockIdCounter).padStart(12, '0')}`;
  }),
}));

const mockReadLegacy = jest.fn();
jest.mock('~/lib/legacySavedRoutes', () => ({
  readLegacySavedRoutes: () => mockReadLegacy(),
}));

const withJotaiProvider = (store: ReturnType<typeof createStore>) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <JotaiProvider store={store}>{children}</JotaiProvider>;
  };

const input: SavedRouteWithTrainTypeInput = {
  hasTrainType: true,
  lineId: 100,
  trainTypeId: 50,
  wantedDestinationId: 7,
  originStationId: 1,
  direction: 'INBOUND',
  notifyStationIds: [2, 7],
  name: '通勤',
  createdAt: new Date('2025-01-01'),
  legs: [
    {
      lineGroupId: 50,
      fromStationId: 10,
      toStationId: 20,
      stationGroupIds: [1, 2],
    },
    {
      lineGroupId: 60,
      fromStationId: 21,
      toStationId: 70,
      stationGroupIds: [2, 7],
    },
  ],
};
const existing: SavedRoute = {
  ...input,
  id: '550e8400-e29b-41d4-a716-446655440000',
};
const renderRoutes = (store = createStore()) =>
  renderHook(() => useSavedRoutes(), { wrapper: withJotaiProvider(store) });

describe('useSavedRoutes', () => {
  beforeEach(() => {
    storage.remove(SAVED_ROUTES_KEY);
    mockIdCounter = 0;
    mockReadLegacy.mockReset().mockResolvedValue([]);
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('MMKVから復元し、SQLiteの移行処理を呼ばない', () => {
    writeSavedRoutes([existing]);
    const { result } = renderRoutes();
    expect(result.current.isInitialized).toBe(true);
    expect(result.current.routes).toEqual([existing]);
    expect(result.current.routes[0].createdAt).toBeInstanceOf(Date);
    expect(mockReadLegacy).not.toHaveBeenCalled();
  });

  it('複数の利用元が同時に初期化しても移行を一度だけ実行する', async () => {
    mockReadLegacy.mockResolvedValue([existing]);
    const store = createStore();
    const first = renderRoutes(store);
    const second = renderRoutes(store);
    await waitFor(() => expect(first.result.current.isInitialized).toBe(true));
    expect(mockReadLegacy).toHaveBeenCalledTimes(1);
    expect(second.result.current.routes).toEqual([existing]);
    expect(readSavedRoutes()).toEqual([existing]);
  });

  it('連続した保存を取りこぼさず、区間・通知駅・方向・日付を再起動後も復元する', async () => {
    writeSavedRoutes([]);
    const { result, unmount } = renderRoutes();
    await act(async () => {
      await Promise.all([
        result.current.save(input),
        result.current.save({ ...input, name: '帰り' }),
      ]);
    });
    const saved = result.current.routes;
    expect(saved.map((r) => r.name)).toEqual(['帰り', '通勤']);
    expect(saved[0].id).not.toBe(saved[1].id);
    expect(saved[1]).toMatchObject({ ...input, createdAt: expect.any(Date) });
    unmount();
    const reopened = renderRoutes();
    expect(reopened.result.current.routes).toEqual(saved);
  });

  it('削除後に再起動しても旧SQLiteのプリセットを復活させない', async () => {
    writeSavedRoutes([existing]);
    const { result, unmount } = renderRoutes();
    await act(async () => {
      await result.current.remove(existing.id);
    });
    expect(readSavedRoutes()).toEqual([]);
    unmount();
    expect(renderRoutes().result.current.routes).toEqual([]);
    expect(mockReadLegacy).not.toHaveBeenCalled();
  });

  it('種別なしの経路を保存・復元し、行き先が違うプリセットと区別する', async () => {
    writeSavedRoutes([]);
    const { result, unmount } = renderRoutes();
    await act(async () => {
      await result.current.save({
        hasTrainType: false,
        trainTypeId: null,
        lineId: 100,
        wantedDestinationId: 7,
        originStationId: 1,
        direction: 'INBOUND',
        notifyStationIds: [7],
        name: '普通',
        createdAt: new Date(),
      });
    });
    const saved = result.current.routes[0];
    expect(
      result.current.find({
        lineId: 100,
        trainTypeId: null,
        wantedDestinationId: 7,
      })
    ).toBe(saved);
    expect(
      result.current.find({
        lineId: 100,
        trainTypeId: null,
        wantedDestinationId: 8,
      })
    ).toBeNull();
    unmount();
    expect(renderRoutes().result.current.routes).toEqual([saved]);
  });

  it('移行先の保存に失敗した場合は次の試行で移行元を再読込する', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockReadLegacy.mockResolvedValue([existing]);
    const set = jest.spyOn(storage, 'set').mockImplementationOnce(() => {
      throw new Error('disk full');
    });
    const { result } = renderRoutes();
    await waitFor(() => expect(console.error).toHaveBeenCalled());
    expect(result.current.isInitialized).toBe(false);
    expect(storage.contains(SAVED_ROUTES_KEY)).toBe(false);
    set.mockRestore();
    await act(async () => {
      await result.current.updateRoutes();
    });
    expect(readSavedRoutes()).toEqual([existing]);
    expect(mockReadLegacy).toHaveBeenCalledTimes(2);
  });

  it('保存失敗時は画面の状態を変更しない', async () => {
    writeSavedRoutes([existing]);
    const { result } = renderRoutes();
    jest.spyOn(storage, 'set').mockImplementation(() => {
      throw new Error('disk full');
    });
    await act(async () => {
      await expect(result.current.save(input)).rejects.toThrow('disk full');
      await expect(result.current.remove(existing.id)).rejects.toThrow(
        'disk full'
      );
    });
    expect(result.current.routes).toEqual([existing]);
  });

  it('移行失敗時は完了扱いにせず、再試行して既存データを保存する', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockReadLegacy.mockRejectedValueOnce(new Error('read failed'));
    const { result } = renderRoutes();
    await waitFor(() => expect(console.error).toHaveBeenCalled());
    expect(result.current.isInitialized).toBe(false);
    expect(storage.contains(SAVED_ROUTES_KEY)).toBe(false);
    mockReadLegacy.mockResolvedValue([existing]);
    await act(async () => {
      await result.current.updateRoutes();
    });
    expect(result.current.routes).toEqual([existing]);
  });

  it('壊れたMMKVデータを空の一覧や旧SQLiteで上書きしない', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    storage.set(SAVED_ROUTES_KEY, '{broken');
    const { result } = renderRoutes();
    await act(async () => {
      await expect(result.current.save(input)).rejects.toThrow();
    });
    expect(result.current.isInitialized).toBe(false);
    expect(storage.getString(SAVED_ROUTES_KEY)).toBe('{broken');
    expect(mockReadLegacy).not.toHaveBeenCalled();
  });

  it('移行中の保存は既存データを引き継いでから追加する', async () => {
    let resolveMigration!: (routes: SavedRoute[]) => void;
    mockReadLegacy.mockReturnValue(
      new Promise((resolve) => {
        resolveMigration = resolve;
      })
    );
    const { result } = renderRoutes();
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      const saving = result.current.save(input);
      resolveMigration([existing]);
      await saving;
    });
    expect(result.current.routes).toHaveLength(2);
    expect(result.current.routes[1]).toEqual(existing);
    expect(readSavedRoutes()).toEqual(result.current.routes);
  });

  describe('find', () => {
    const withTrainType: SavedRoute = {
      id: 'route-with',
      hasTrainType: true,
      lineId: 100,
      trainTypeId: 7,
      wantedDestinationId: null,
      originStationId: null,
      direction: null,
      notifyStationIds: [],
      name: 'With Train Type',
      createdAt: new Date('2025-01-03T00:00:00.000Z'),
    };
    const withoutTrainType: SavedRoute = {
      id: 'route-without',
      hasTrainType: false,
      lineId: 200,
      trainTypeId: null,
      wantedDestinationId: null,
      originStationId: null,
      direction: null,
      notifyStationIds: [],
      name: 'Without Train Type',
      createdAt: new Date('2025-01-04T00:00:00.000Z'),
    };

    const renderWithPresetRoutes = () => {
      const store = createStore();
      store.set(navigationState, {
        ...initialNavigationState,
        presetsFetched: true,
        presetRoutes: [withTrainType, withoutTrainType],
      });
      const { result } = renderHook(
        () => require('./useSavedRoutes').useSavedRoutes(),
        {
          wrapper: withJotaiProvider(store),
        }
      );
      return { result, store };
    };

    it('trainTypeId が一致するルートを返す', async () => {
      const { result, store } = renderWithPresetRoutes();
      await waitFor(() =>
        expect(store.get(navigationState).presetsFetched).toBe(true)
      );
      expect(
        result.current.find({
          lineId: withTrainType.lineId,
          trainTypeId: withTrainType.trainTypeId,
          wantedDestinationId: null,
          originStationId: null,
        })
      ).toBe(withTrainType);
    });

    it('trainTypeId が指定されている場合、hasTrainType: false のルートは返さない', async () => {
      const { result, store } = renderWithPresetRoutes();
      await waitFor(() =>
        expect(store.get(navigationState).presetsFetched).toBe(true)
      );
      // trainTypeId を指定して検索した場合、hasTrainType: false のルートは一致しない
      expect(
        result.current.find({
          lineId: withoutTrainType.lineId,
          trainTypeId: 999,
          wantedDestinationId: null,
          originStationId: null,
        })
      ).toBeNull();
    });

    it('trainTypeId が null の場合、hasTrainType: false のルートを返す', async () => {
      const { result, store } = renderWithPresetRoutes();
      await waitFor(() =>
        expect(store.get(navigationState).presetsFetched).toBe(true)
      );
      expect(
        result.current.find({
          lineId: withoutTrainType.lineId,
          trainTypeId: null,
          wantedDestinationId: null,
          originStationId: null,
        })
      ).toBe(withoutTrainType);
    });

    it('一致するルートがなければ null を返す', async () => {
      const { result, store } = renderWithPresetRoutes();
      await waitFor(() =>
        expect(store.get(navigationState).presetsFetched).toBe(true)
      );
      expect(
        result.current.find({
          lineId: 9999,
          trainTypeId: 8888,
          wantedDestinationId: null,
          originStationId: null,
        })
      ).toBeNull();
    });

    it('trainTypeId が指定されている場合、hasTrainType: true でも trainTypeId が一致しなければ null を返す', async () => {
      const { result, store } = renderWithPresetRoutes();
      await waitFor(() =>
        expect(store.get(navigationState).presetsFetched).toBe(true)
      );
      // lineId は一致するが trainTypeId が異なる
      expect(
        result.current.find({
          lineId: withTrainType.lineId,
          trainTypeId: 999, // 実際の trainTypeId は 7
          wantedDestinationId: null,
          originStationId: null,
        })
      ).toBeNull();
    });

    it('trainTypeId が null の場合、hasTrainType: true のルートは返さない', async () => {
      const { result, store } = renderWithPresetRoutes();
      await waitFor(() =>
        expect(store.get(navigationState).presetsFetched).toBe(true)
      );
      // lineId は一致するが trainTypeId: null で検索
      expect(
        result.current.find({
          lineId: withTrainType.lineId,
          trainTypeId: null,
          wantedDestinationId: null,
          originStationId: null,
        })
      ).toBeNull();
    });

    it('同じ lineId で異なる trainTypeId の経路が複数ある場合、正しい経路を返す', async () => {
      const route1: SavedRoute = {
        id: 'route-1',
        hasTrainType: true,
        lineId: 300,
        trainTypeId: 10,
        wantedDestinationId: null,
        originStationId: null,
        direction: null,
        notifyStationIds: [],
        name: 'Route 1',
        createdAt: new Date('2025-01-05T00:00:00.000Z'),
      };
      const route2: SavedRoute = {
        id: 'route-2',
        hasTrainType: true,
        lineId: 300,
        trainTypeId: 20,
        wantedDestinationId: null,
        originStationId: null,
        direction: null,
        notifyStationIds: [],
        name: 'Route 2',
        createdAt: new Date('2025-01-06T00:00:00.000Z'),
      };
      const routeNoTrainType: SavedRoute = {
        id: 'route-3',
        hasTrainType: false,
        lineId: 300,
        trainTypeId: null,
        wantedDestinationId: null,
        originStationId: null,
        direction: null,
        notifyStationIds: [],
        name: 'Route 3 (no train type)',
        createdAt: new Date('2025-01-07T00:00:00.000Z'),
      };

      const store = createStore();
      store.set(navigationState, {
        ...initialNavigationState,
        presetsFetched: true,
        presetRoutes: [route1, route2, routeNoTrainType],
      });
      const { result } = renderHook(
        () => require('./useSavedRoutes').useSavedRoutes(),
        {
          wrapper: withJotaiProvider(store),
        }
      );

      await waitFor(() =>
        expect(store.get(navigationState).presetsFetched).toBe(true)
      );

      // trainTypeId: 10 で検索 → route1 を返す
      expect(
        result.current.find({
          lineId: 300,
          trainTypeId: 10,
          wantedDestinationId: null,
          originStationId: null,
        })
      ).toBe(route1);

      // trainTypeId: 20 で検索 → route2 を返す
      expect(
        result.current.find({
          lineId: 300,
          trainTypeId: 20,
          wantedDestinationId: null,
          originStationId: null,
        })
      ).toBe(route2);

      // trainTypeId: null で検索 → routeNoTrainType を返す
      expect(
        result.current.find({
          lineId: 300,
          trainTypeId: null,
          wantedDestinationId: null,
          originStationId: null,
        })
      ).toBe(routeNoTrainType);

      // trainTypeId: 30 で検索 → 該当なし
      expect(
        result.current.find({
          lineId: 300,
          trainTypeId: 30,
          wantedDestinationId: null,
          originStationId: null,
        })
      ).toBeNull();
    });

    it('trainTypeId が指定されている場合、lineId が異なっても trainTypeId で経路を見つける', async () => {
      // JR神戸線（lineId: 500）でサンライズ出雲（trainTypeId: 50）を保存
      // 東海道線（lineId: 600）から検索しても見つかるべき
      const sunriseLine: SavedRoute = {
        id: 'sunrise-route',
        hasTrainType: true,
        lineId: 500, // JR神戸線のID
        trainTypeId: 50, // サンライズ出雲のgroupId
        wantedDestinationId: null,
        originStationId: null,
        direction: null,
        notifyStationIds: [],
        name: 'サンライズ出雲',
        createdAt: new Date('2025-01-08T00:00:00.000Z'),
      };

      const store = createStore();
      store.set(navigationState, {
        ...initialNavigationState,
        presetsFetched: true,
        presetRoutes: [sunriseLine],
      });
      const { result } = renderHook(
        () => require('./useSavedRoutes').useSavedRoutes(),
        {
          wrapper: withJotaiProvider(store),
        }
      );

      await waitFor(() =>
        expect(store.get(navigationState).presetsFetched).toBe(true)
      );

      // 同じlineIdで検索 → 見つかる
      expect(
        result.current.find({
          lineId: 500,
          trainTypeId: 50,
          wantedDestinationId: null,
          originStationId: null,
        })
      ).toBe(sunriseLine);

      // 異なるlineId（東海道線）で検索しても trainTypeId で見つかる
      expect(
        result.current.find({
          lineId: 600,
          trainTypeId: 50,
          wantedDestinationId: null,
          originStationId: null,
        })
      ).toBe(sunriseLine);

      // 異なるtrainTypeIdでは見つからない
      expect(
        result.current.find({
          lineId: 500,
          trainTypeId: 99,
          wantedDestinationId: null,
          originStationId: null,
        })
      ).toBeNull();
    });
  });

  describe('乗換経路(legs)', () => {
    const legs = [
      {
        lineGroupId: 900,
        fromStationId: 101,
        toStationId: 103,
        stationGroupIds: [1, 2, 3],
      },
      {
        lineGroupId: 300,
        fromStationId: 202,
        toStationId: 204,
        stationGroupIds: [3, 6, 7],
      },
    ];
    const transferInput: SavedRouteWithTrainTypeInput = {
      hasTrainType: true,
      lineId: 99301,
      trainTypeId: 900,
      wantedDestinationId: 7,
      originStationId: 1,
      direction: 'INBOUND',
      notifyStationIds: [],
      legs,
      name: '都営大江戸線・山手線',
      createdAt: new Date('2025-03-01T00:00:00.000Z'),
    };

    const renderSavedRoutes = (presetRoutes: SavedRoute[] = []) => {
      const store = createStore();
      store.set(navigationState, {
        ...initialNavigationState,
        presetsFetched: true,
        presetRoutes,
      });
      const { result } = renderHook(
        () => require('./useSavedRoutes').useSavedRoutes(),
        { wrapper: withJotaiProvider(store) }
      );
      return { result };
    };

    it('find: 区間が同じ乗換経路のプリセットを返し、最初の区間の系統だけの検索には当てない', async () => {
      const transferRoute: SavedRoute = {
        ...transferInput,
        id: 'transfer',
        hasTrainType: true,
        trainTypeId: 900,
      };
      const { result } = renderSavedRoutes([transferRoute]);

      expect(
        result.current.find({
          lineId: 99301,
          trainTypeId: 900,
          wantedDestinationId: 7,
          legs: legs.map((leg) => ({ ...leg })),
        })
      ).toBe(transferRoute);
      // 行き先が違えば別のプリセット
      expect(
        result.current.find({
          lineId: 99301,
          trainTypeId: 900,
          wantedDestinationId: 6,
          legs,
        })
      ).toBeNull();
      // 最初の区間の系統(大江戸線)だけの経路とは別物
      expect(
        result.current.find({
          lineId: 99301,
          trainTypeId: 900,
          wantedDestinationId: 7,
        })
      ).toBeNull();
    });

    it('find: 区間を指定すると、同じ系統の乗換の無いプリセットには当てない', async () => {
      const plainRoute: SavedRoute = {
        ...transferInput,
        id: 'plain',
        hasTrainType: true,
        trainTypeId: 900,
        legs: undefined,
      };
      const { result } = renderSavedRoutes([plainRoute]);

      expect(
        result.current.find({
          lineId: 99301,
          trainTypeId: 900,
          wantedDestinationId: 7,
          legs,
        })
      ).toBeNull();
    });
  });
});
