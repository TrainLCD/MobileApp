import { renderHook, waitFor } from '@testing-library/react-native';
import { createStore, Provider as JotaiProvider } from 'jotai';
import type {
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
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <JotaiProvider store={store}>{children}</JotaiProvider>;
  };

describe('useSavedRoutes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIdCounter = 0;
    mockDb.execAsync.mockResolvedValue();
    mockDb.getAllAsync.mockResolvedValue([]);
    mockDb.runAsync.mockResolvedValue();
  });

  describe('initialization', () => {
    it('DB 初期化を行い isInitialized を true にする', async () => {
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

      expect(mockDb.execAsync).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS saved_routes')
      );
      expect(result.current.isInitialized).toBe(true);
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
          destinationStationId: 100,
          hasTrainType: 1,
          createdAt: '2025-01-01T00:00:00.000Z',
        },
        {
          id: '2',
          name: 'Without TrainType',
          lineId: 11,
          trainTypeId: 999,
          destinationStationId: 101,
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

      await result.current.updateRoutes();

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
          destinationStationId: null,
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

      await result.current.updateRoutes();

      await waitFor(() => expect(result.current.routes).toEqual([]));
    });
  });

  describe('find', () => {
    it('destinationStationId が null の場合は trainTypeId または lineId が一致する最初の要素を返す', async () => {
      mockDb.getAllAsync.mockResolvedValue([
        {
          id: 'a',
          name: 'A',
          lineId: 100,
          trainTypeId: 50,
          destinationStationId: null,
          hasTrainType: 1,
          createdAt: '2025-01-01T00:00:00.000Z',
        },
        {
          id: 'b',
          name: 'B',
          lineId: 200,
          trainTypeId: null,
          destinationStationId: null,
          hasTrainType: 0,
          createdAt: '2025-01-02T00:00:00.000Z',
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
      await result.current.updateRoutes();

      // trainTypeId でマッチ
      await waitFor(() =>
        expect(
          result.current.find({
            lineId: 999,
            destinationStationId: null,
            trainTypeId: 50,
          })?.id
        ).toBe('a')
      );
      // lineId でマッチ
      await waitFor(() =>
        expect(
          result.current.find({
            lineId: 200,
            destinationStationId: null,
            trainTypeId: null,
          })?.id
        ).toBe('b')
      );
    });

    it('destinationStationId が指定されている場合は (trainTypeId, dest) または (lineId, dest) で一致', async () => {
      mockDb.getAllAsync.mockResolvedValue([
        {
          id: 'c',
          name: 'C',
          lineId: 300,
          trainTypeId: 10,
          destinationStationId: 123,
          hasTrainType: 1,
          createdAt: '2025-01-03T00:00:00.000Z',
        },
        {
          id: 'd',
          name: 'D',
          lineId: 400,
          trainTypeId: null,
          destinationStationId: 123,
          hasTrainType: 0,
          createdAt: '2025-01-04T00:00:00.000Z',
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
      await result.current.updateRoutes();

      // (trainTypeId, destinationStationId) で一致
      await waitFor(() =>
        expect(
          result.current.find({
            lineId: null,
            destinationStationId: 123,
            trainTypeId: 10,
          })?.id
        ).toBe('c')
      );
      // (lineId, destinationStationId) で一致
      await waitFor(() =>
        expect(
          result.current.find({
            lineId: 400,
            destinationStationId: 123,
            trainTypeId: null,
          })?.id
        ).toBe('d')
      );
      // 見つからない
      await waitFor(() =>
        expect(
          result.current.find({
            lineId: 999,
            destinationStationId: 555,
            trainTypeId: null,
          })
        ).toBeNull()
      );
    });
  });

  describe('save / remove', () => {
    const withType: SavedRouteWithTrainTypeInput = {
      hasTrainType: true,
      lineId: 1,
      trainTypeId: 9,
      destinationStationId: 10,
      name: 'WithType',
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
    };
    const withoutType: SavedRouteWithoutTrainTypeInput = {
      hasTrainType: false,
      lineId: 2,
      trainTypeId: null,
      destinationStationId: 20,
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

      const saved1 = await result.current.save(withType);

      expect(saved1.id).toMatch(/^550e8400-e29b-41d4-a716-4466554400001$/);
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO saved_routes'),
        [
          saved1.id,
          withType.name,
          withType.lineId,
          withType.trainTypeId,
          withType.destinationStationId,
          1,
          saved1.createdAt.toISOString(),
        ]
      );

      await waitFor(() => expect(result.current.routes[0]?.id).toBe(saved1.id));

      const saved2 = await result.current.save(withoutType);
      expect(saved2.hasTrainType).toBe(false);
      expect(saved2.trainTypeId).toBeNull();
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO saved_routes'),
        expect.arrayContaining([
          saved2.id,
          withoutType.name,
          withoutType.lineId,
          null,
          withoutType.destinationStationId,
          0,
          saved2.createdAt.toISOString(),
        ])
      );

      await waitFor(() => expect(result.current.routes.length).toBe(2));
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

      const saved = await result.current.save(withType);
      await waitFor(() => expect(result.current.routes.length).toBe(1));

      await expect(result.current.remove(saved.id)).resolves.toBeUndefined();
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'DELETE FROM saved_routes WHERE id = ?',
        [saved.id]
      );
      await waitFor(() => expect(result.current.routes.length).toBe(0));
    });
  });
});
