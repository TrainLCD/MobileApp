import { renderHook, waitFor } from '@testing-library/react-native';
import type {
  SavedRouteWithoutTrainTypeInput,
  SavedRouteWithTrainTypeInput,
} from '~/models/SavedRoute';

// randomUUIDをモック
let mockIdCounter = 0;
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => {
    mockIdCounter++;
    return `550e8400-e29b-41d4-a716-446655440000${mockIdCounter}`;
  }),
}));

// SQLiteをモック
const mockDb = {
  execSync: jest.fn(),
  getAllAsync: jest.fn(),
  getFirstAsync: jest.fn(),
  runAsync: jest.fn(),
};

jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(() => mockDb),
}));

// useSavedRoutesをインポートする前にモックを設定する必要があるため、動的インポートを使用
const useSavedRoutes = () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('./useSavedRoutes').useSavedRoutes();
};

describe('useSavedRoutes', () => {
  beforeEach(() => {
    // 各テスト前にモック関数をリセット
    jest.clearAllMocks();
    mockIdCounter = 0;

    // デフォルトのモック実装を設定
    mockDb.execSync.mockImplementation(() => {});
    mockDb.getAllAsync.mockResolvedValue([]);
    mockDb.getFirstAsync.mockResolvedValue(null);
    mockDb.runAsync.mockResolvedValue(undefined);
  });

  describe('initialization', () => {
    it('データベースのテーブルを作成し、isInitializedをtrueにするべき', async () => {
      const { result } = renderHook(() => useSavedRoutes());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      expect(mockDb.execSync).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS saved_routes')
      );
    });
  });

  describe('getAll', () => {
    it('SavedRouteの配列を返すPromiseを返すべき', async () => {
      const mockRows = [
        {
          id: '1',
          name: 'Test Route',
          lineId: 123,
          trainTypeId: 456,
          destinationStationId: 789,
          hasTrainType: 1,
          createdAt: '2025-08-24T12:00:00.000Z',
        },
      ];
      mockDb.getAllAsync.mockResolvedValue(mockRows);

      const { result } = renderHook(() => useSavedRoutes());
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      const routes = await result.current.getAll();

      expect(Array.isArray(routes)).toBe(true);
      expect(routes.length).toBe(1);
      expect(routes[0].hasTrainType).toBe(true);
      expect(routes[0].createdAt).toBeInstanceOf(Date);
      expect(routes[0].trainTypeId).toBe(456);
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        'SELECT * FROM saved_routes ORDER BY createdAt DESC'
      );
    });

    it('空の配列を返すべき', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      const { result } = renderHook(() => useSavedRoutes());
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      const routes = await result.current.getAll();
      expect(routes).toEqual([]);
    });

    it('hasTrainTypeがfalseの場合、trainTypeIdをnullに変換するべき', async () => {
      const mockRows = [
        {
          id: '1',
          name: 'Test Route',
          lineId: 123,
          trainTypeId: 456,
          destinationStationId: 789,
          hasTrainType: 0, // false
          createdAt: '2025-08-24T12:00:00.000Z',
        },
      ];
      mockDb.getAllAsync.mockResolvedValue(mockRows);

      const { result } = renderHook(() => useSavedRoutes());
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      const routes = await result.current.getAll();

      expect(routes[0].hasTrainType).toBe(false);
      expect(routes[0].trainTypeId).toBeNull();
    });
  });

  describe('find', () => {
    it('trainTypeIdがnullの場合、hasTrainType=0を明示し最新を検索するべき', async () => {
      const mockRow = {
        id: '1',
        name: 'Test Route',
        lineId: 11302,
        trainTypeId: null,
        destinationStationId: null,
        hasTrainType: 0,
        createdAt: '2025-08-24T12:00:00.000Z',
      };
      mockDb.getFirstAsync.mockResolvedValue(mockRow);

      const { result } = renderHook(() => useSavedRoutes());
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      const route = await result.current.find({
        lineId: 11302,
        destinationStationId: null,
        trainTypeId: null,
      });

      expect(route).toBeDefined();
      expect(route?.lineId).toBe(11302);
      expect(route?.hasTrainType).toBe(false);
      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        'SELECT * FROM saved_routes WHERE hasTrainType = 0 AND lineId = ? AND destinationStationId IS NULL ORDER BY createdAt DESC LIMIT 1',
        [11302]
      );
    });

    it('trainTypeIdが指定された場合、hasTrainType=1を明示し最新を検索するべき', async () => {
      const mockRow = {
        id: '1',
        name: 'Test Route',
        lineId: 11603,
        trainTypeId: 48,
        destinationStationId: null,
        hasTrainType: 1,
        createdAt: '2025-08-24T12:00:00.000Z',
      };
      mockDb.getFirstAsync.mockResolvedValue(mockRow);

      const { result } = renderHook(() => useSavedRoutes());
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      const route = await result.current.find({
        lineId: 11603,
        destinationStationId: null,
        trainTypeId: 48,
      });

      expect(route).toBeDefined();
      expect(route?.trainTypeId).toBe(48);
      expect(route?.hasTrainType).toBe(true);
      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        'SELECT * FROM saved_routes WHERE hasTrainType = 1 AND trainTypeId = ? AND destinationStationId IS NULL ORDER BY createdAt DESC LIMIT 1',
        [48]
      );
    });

    it('該当しない条件の場合、undefinedを返すべき', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      const { result } = renderHook(() => useSavedRoutes());
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      const route = await result.current.find({
        lineId: 999,
        destinationStationId: null,
        trainTypeId: null,
      });

      expect(route).toBeUndefined();
    });
  });

  describe('save', () => {
    const mockRouteWithTrainType: SavedRouteWithTrainTypeInput = {
      hasTrainType: true,
      lineId: 200,
      trainTypeId: 1,
      destinationStationId: 200,
      name: 'Test Route with Train Type',
      createdAt: new Date('2025-08-24T12:00:00.000Z'),
    };

    const mockRouteWithoutTrainType: SavedRouteWithoutTrainTypeInput = {
      hasTrainType: false,
      lineId: 200,
      trainTypeId: null,
      destinationStationId: 400,
      name: 'Test Route without Train Type',
      createdAt: new Date('2025-08-24T12:00:00.000Z'),
    };

    it('電車種別ありの経路を保存し、正しいパラメータでDBに挿入するべき', async () => {
      const { result } = renderHook(() => useSavedRoutes());
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      const savedRoute = await result.current.save(mockRouteWithTrainType);

      expect(savedRoute).toBeDefined();
      expect(savedRoute.id).toMatch(/^550e8400-e29b-41d4-a716-4466554400001$/);
      expect(savedRoute.name).toBe(mockRouteWithTrainType.name);
      expect(savedRoute.hasTrainType).toBe(true);
      expect(savedRoute.trainTypeId).toBe(mockRouteWithTrainType.trainTypeId);
      expect(savedRoute.createdAt).toBeInstanceOf(Date);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO saved_routes'),
        [
          savedRoute.id,
          mockRouteWithTrainType.name,
          mockRouteWithTrainType.lineId,
          mockRouteWithTrainType.trainTypeId,
          mockRouteWithTrainType.destinationStationId,
          1, // hasTrainType: true
          savedRoute.createdAt.toISOString(),
        ]
      );
    });

    it('電車種別なしの経路を保存し、trainTypeIdをnullで挿入するべき', async () => {
      const { result } = renderHook(() => useSavedRoutes());
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      const savedRoute = await result.current.save(mockRouteWithoutTrainType);

      expect(savedRoute.hasTrainType).toBe(false);
      expect(savedRoute.trainTypeId).toBeNull();

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO saved_routes'),
        expect.arrayContaining([
          expect.any(String), // id
          mockRouteWithoutTrainType.name,
          mockRouteWithoutTrainType.lineId,
          null, // trainTypeId
          mockRouteWithoutTrainType.destinationStationId,
          0, // hasTrainType: false
          expect.any(String), // createdAt
        ])
      );
    });

    it('UUIDを生成してIDとして使用するべき', async () => {
      const { result } = renderHook(() => useSavedRoutes());
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      const savedRoute = await result.current.save(mockRouteWithTrainType);

      expect(savedRoute.id).toMatch(
        /^550e8400-e29b-41d4-a716-446655440000\d+$/
      );
    });
  });

  describe('remove', () => {
    it('指定されたIDで経路を削除するべき', async () => {
      const testId = '550e8400-e29b-41d4-a716-446655440000';

      const { result } = renderHook(() => useSavedRoutes());
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      await result.current.remove(testId);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'DELETE FROM saved_routes WHERE id = ?',
        [testId]
      );
    });

    it('削除操作が完了するまで待機するべき', async () => {
      const testId = '550e8400-e29b-41d4-a716-446655440000';

      const { result } = renderHook(() => useSavedRoutes());
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      await expect(result.current.remove(testId)).resolves.toBeUndefined();
    });
  });

  describe('エラーハンドリング', () => {
    it('hasTrainType=trueだがtrainTypeId=nullの破損レコードは読み飛ばすべき', async () => {
      const invalidRow = {
        id: '1',
        name: 'Invalid Route',
        lineId: 123,
        trainTypeId: null,
        destinationStationId: 789,
        hasTrainType: 1, // true but trainTypeId is null
        createdAt: '2025-08-24T12:00:00.000Z',
      };
      mockDb.getAllAsync.mockResolvedValue([invalidRow]);

      const { result } = renderHook(() => useSavedRoutes());
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      await expect(result.current.getAll()).resolves.toEqual([]);
    });
  });
});
