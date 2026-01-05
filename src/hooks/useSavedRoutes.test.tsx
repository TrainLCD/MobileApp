import { act, renderHook, waitFor } from '@testing-library/react-native';
import { Provider as JotaiProvider } from 'jotai';
import { createStore } from 'jotai/vanilla';
import type { ReactNode } from 'react';
import type {
  SavedRoute,
  SavedRouteWithoutTrainTypeInput,
  SavedRouteWithTrainTypeInput,
} from '~/models/SavedRoute';
import navigationState, {
  initialNavigationState,
} from '~/store/atoms/navigation';

// randomUUID をモック（安定した ID を生成）
let mockIdCounter = 0;
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => {
    mockIdCounter += 1;
    return `550e8400-e29b-41d4-a716-446655440000${mockIdCounter}`;
  }),
}));

// SQLite をモック（実装が execAsync/getAllAsync/runAsync を使うためそれらを用意）
interface MockDb {
  execAsync: (sql: string) => Promise<void>;
  getAllAsync: (sql: string, params?: unknown) => Promise<unknown[]>;
  runAsync: (sql: string, params: unknown[]) => Promise<void>;
}
const mockDb: jest.Mocked<MockDb> = {
  execAsync: jest.fn(),
  getAllAsync: jest.fn(),
  runAsync: jest.fn(),
};

jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(() => mockDb),
}));

// 各テストを独立させるため Jotai のストアを毎回作り直す
const withJotaiProvider = (store: ReturnType<typeof createStore>) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <JotaiProvider store={store}>{children}</JotaiProvider>;
  };

describe('useSavedRoutes', () => {
  beforeEach(() => {
    mockIdCounter = 0;
    mockDb.execAsync.mockResolvedValue();
    mockDb.getAllAsync.mockResolvedValue([]);
    mockDb.runAsync.mockResolvedValue();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('DB 初期化でテーブルとインデックスを作成し presetsFetched を true にする', async () => {
      const store = createStore();
      store.set(navigationState, initialNavigationState);
      const { result } = renderHook(
        () => require('./useSavedRoutes').useSavedRoutes(),
        {
          wrapper: withJotaiProvider(store),
        }
      );

      await waitFor(() => expect(mockDb.execAsync).toHaveBeenCalledTimes(4));
      expect(mockDb.execAsync).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('CREATE TABLE IF NOT EXISTS saved_routes')
      );
      expect(mockDb.execAsync).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining(
          'CREATE INDEX IF NOT EXISTS idx_saved_routes_createdAt'
        )
      );
      expect(mockDb.execAsync).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining(
          'CREATE INDEX IF NOT EXISTS idx_saved_routes_line_dest_has'
        )
      );
      expect(mockDb.execAsync).toHaveBeenNthCalledWith(
        4,
        expect.stringContaining(
          'CREATE INDEX IF NOT EXISTS idx_saved_routes_ttype_dest_has'
        )
      );

      await waitFor(() => expect(result.current.isInitialized).toBe(true));
      expect(store.get(navigationState).presetsFetched).toBe(true);
    });
  });

  describe('updateRoutes', () => {
    it('DB から取得して routes を更新する（hasTrainType の変換含む）', async () => {
      const rows = [
        {
          id: '1',
          name: 'With TrainType',
          lineId: 10,
          trainTypeId: 5,
          hasTrainType: 1,
          createdAt: '2025-01-01T00:00:00.000Z',
        },
        {
          id: '2',
          name: 'Without TrainType',
          lineId: 11,
          trainTypeId: 999,
          hasTrainType: 0,
          createdAt: '2025-01-02T00:00:00.000Z',
        },
      ];
      mockDb.getAllAsync.mockResolvedValue(rows as unknown[]);

      const store = createStore();
      store.set(navigationState, {
        ...initialNavigationState,
        presetsFetched: true,
      });
      const { result } = renderHook(
        () => require('./useSavedRoutes').useSavedRoutes(),
        {
          wrapper: withJotaiProvider(store),
        }
      );

      await act(async () => {
        await result.current.updateRoutes();
      });

      await waitFor(() => expect(result.current.routes.length).toBe(2));
      const [r1, r2] = result.current.routes;
      expect(r1.hasTrainType).toBe(true);
      expect(r1.trainTypeId).toBe(5);
      expect(r1.createdAt).toBeInstanceOf(Date);

      expect(r2.hasTrainType).toBe(false);
      expect(r2.trainTypeId).toBeNull();

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        'SELECT * FROM saved_routes ORDER BY createdAt DESC'
      );
    });

    it('破損レコード（hasTrainType=1 かつ trainTypeId=null）は除外する', async () => {
      mockDb.getAllAsync.mockResolvedValue([
        {
          id: 'x',
          name: 'Invalid',
          lineId: 1,
          trainTypeId: null,
          hasTrainType: 1,
          createdAt: '2025-01-01T00:00:00.000Z',
        },
      ] as unknown[]);

      const store = createStore();
      store.set(navigationState, {
        ...initialNavigationState,
        presetsFetched: true,
      });
      const { result } = renderHook(
        () => require('./useSavedRoutes').useSavedRoutes(),
        {
          wrapper: withJotaiProvider(store),
        }
      );

      await act(async () => {
        await result.current.updateRoutes();
      });

      await waitFor(() => expect(result.current.routes).toEqual([]));
    });
  });

  describe('save / remove', () => {
    const withType: SavedRouteWithTrainTypeInput = {
      hasTrainType: true,
      lineId: 1,
      trainTypeId: 9,
      name: 'WithType',
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
    };
    const withoutType: SavedRouteWithoutTrainTypeInput = {
      hasTrainType: false,
      lineId: 2,
      trainTypeId: null,
      name: 'WithoutType',
      createdAt: new Date('2025-01-02T00:00:00.000Z'),
    };

    it('save: 正しく INSERT され、routes が更新される', async () => {
      const store = createStore();
      store.set(navigationState, {
        ...initialNavigationState,
        presetsFetched: true,
      });
      const { result } = renderHook(
        () => require('./useSavedRoutes').useSavedRoutes(),
        {
          wrapper: withJotaiProvider(store),
        }
      );

      let saved1: SavedRoute | undefined;
      await act(async () => {
        saved1 = await result.current.save(withType);
      });

      expect(saved1).toBeDefined();
      if (!saved1) {
        throw new Error('save should return route with train type');
      }
      const saved1Defined: SavedRoute = saved1;
      expect(saved1Defined.id).toMatch(
        /^550e8400-e29b-41d4-a716-4466554400001$/
      );
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO saved_routes'),
        [
          saved1Defined.id,
          withType.name,
          withType.lineId,
          withType.trainTypeId,
          1,
          saved1Defined.createdAt.toISOString(),
        ]
      );

      await waitFor(() =>
        expect(result.current.routes[0]?.id).toBe(saved1Defined.id)
      );

      let saved2: SavedRoute | undefined;
      await act(async () => {
        saved2 = await result.current.save(withoutType);
      });
      expect(saved2).toBeDefined();
      if (!saved2) {
        throw new Error('save should return route without train type');
      }
      const saved2Defined: SavedRoute = saved2;
      expect(saved2Defined.hasTrainType).toBe(false);
      expect(saved2Defined.trainTypeId).toBeNull();
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO saved_routes'),
        expect.arrayContaining([
          saved2Defined.id,
          withoutType.name,
          withoutType.lineId,
          null,
          0,
          saved2Defined.createdAt.toISOString(),
        ])
      );

      await waitFor(() => expect(result.current.routes.length).toBe(2));
      expect(
        result.current.routes.map((route: SavedRoute) => route.id)
      ).toEqual([saved2Defined.id, saved1Defined.id]);
    });

    it('remove: 指定 ID を削除し routes からも取り除く', async () => {
      const store = createStore();
      store.set(navigationState, {
        ...initialNavigationState,
        presetsFetched: true,
      });
      const { result } = renderHook(
        () => require('./useSavedRoutes').useSavedRoutes(),
        {
          wrapper: withJotaiProvider(store),
        }
      );

      let saved: SavedRoute | undefined;
      await act(async () => {
        saved = await result.current.save(withType);
      });
      expect(saved).toBeDefined();
      if (!saved) {
        throw new Error('save should return route before removing');
      }
      const savedDefined: SavedRoute = saved;
      await waitFor(() => expect(result.current.routes.length).toBe(1));

      await act(async () => {
        await result.current.remove(savedDefined.id);
      });
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'DELETE FROM saved_routes WHERE id = ?',
        [savedDefined.id]
      );
      await waitFor(() => expect(result.current.routes.length).toBe(0));
    });
  });

  describe('find', () => {
    const withTrainType: SavedRoute = {
      id: 'route-with',
      hasTrainType: true,
      lineId: 100,
      trainTypeId: 7,
      name: 'With Train Type',
      createdAt: new Date('2025-01-03T00:00:00.000Z'),
    };
    const withoutTrainType: SavedRoute = {
      id: 'route-without',
      hasTrainType: false,
      lineId: 200,
      trainTypeId: null,
      name: 'Without Train Type',
      createdAt: new Date('2025-01-04T00:00:00.000Z'),
    };

    const renderWithPresetRoutes = () => {
      const store = createStore();
      store.set(navigationState, {
        ...initialNavigationState,
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
        })
      ).toBe(withoutTrainType);
    });

    it('一致するルートがなければ null を返す', async () => {
      const { result, store } = renderWithPresetRoutes();
      await waitFor(() =>
        expect(store.get(navigationState).presetsFetched).toBe(true)
      );
      expect(
        result.current.find({ lineId: 9999, trainTypeId: 8888 })
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
        })
      ).toBeNull();
    });

    it('同じ lineId で異なる trainTypeId の経路が複数ある場合、正しい経路を返す', async () => {
      const route1: SavedRoute = {
        id: 'route-1',
        hasTrainType: true,
        lineId: 300,
        trainTypeId: 10,
        name: 'Route 1',
        createdAt: new Date('2025-01-05T00:00:00.000Z'),
      };
      const route2: SavedRoute = {
        id: 'route-2',
        hasTrainType: true,
        lineId: 300,
        trainTypeId: 20,
        name: 'Route 2',
        createdAt: new Date('2025-01-06T00:00:00.000Z'),
      };
      const routeNoTrainType: SavedRoute = {
        id: 'route-3',
        hasTrainType: false,
        lineId: 300,
        trainTypeId: null,
        name: 'Route 3 (no train type)',
        createdAt: new Date('2025-01-07T00:00:00.000Z'),
      };

      const store = createStore();
      store.set(navigationState, {
        ...initialNavigationState,
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
      expect(result.current.find({ lineId: 300, trainTypeId: 10 })).toBe(
        route1
      );

      // trainTypeId: 20 で検索 → route2 を返す
      expect(result.current.find({ lineId: 300, trainTypeId: 20 })).toBe(
        route2
      );

      // trainTypeId: null で検索 → routeNoTrainType を返す
      expect(result.current.find({ lineId: 300, trainTypeId: null })).toBe(
        routeNoTrainType
      );

      // trainTypeId: 30 で検索 → 該当なし
      expect(result.current.find({ lineId: 300, trainTypeId: 30 })).toBeNull();
    });
  });
});
