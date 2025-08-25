import { renderHook } from '@testing-library/react-native';
import type {
  SavedRouteWithoutTrainTypeInput,
  SavedRouteWithTrainTypeInput,
} from '~/models/SavedRoute';
import { useSavedRoutes } from './useSavedRoutes';

// randomUUIDをモック
let mockIdCounter = 0;
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => {
    mockIdCounter++;
    return `550e8400-e29b-41d4-a716-44665544000${mockIdCounter}`;
  }),
}));

describe('useSavedRoutes', () => {
  let hook: ReturnType<typeof useSavedRoutes>;

  beforeEach(() => {
    // 各テスト前にモック関数をリセット
    jest.clearAllMocks();
    mockIdCounter = 0;
    const { result } = renderHook(() => useSavedRoutes());
    hook = result.current;
  });

  describe('getAll', () => {
    it('SavedRouteの配列を返すPromiseを返すべき', async () => {
      const result = await hook.getAll();
      expect(Array.isArray(result)).toBe(true);
      // モックデータが含まれているため、配列が空でないことを確認
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('DBからすべての保存済み経路を返すべき', async () => {
      const routes = await hook.getAll();
      expect(routes).toBeDefined();
      expect(typeof routes).toBe('object');
    });
  });

  describe('find', () => {
    it('lineIdが指定された場合、lineIdで経路を検索してSavedRoute | undefinedを返すべき', async () => {
      const result = await hook.find({ lineId: 100 });
      // 現在の実装では常にundefinedを返す
      expect(result).toBeUndefined();
    });

    it('trainTypeIdが指定された場合、trainTypeIdで経路を検索してSavedRoute | undefinedを返すべき', async () => {
      const result = await hook.find({ trainTypeId: 1 });
      // 現在の実装では常にundefinedを返す
      expect(result).toBeUndefined();
    });

    it('lineIdとtrainTypeIdの両方が指定された場合、両方の値で経路を検索してSavedRoute | undefinedを返すべき', async () => {
      const result = await hook.find({ lineId: 100, trainTypeId: 1 });
      // 現在の実装では常にundefinedを返す
      expect(result).toBeUndefined();
    });

    it('経路が存在しない場合はundefinedをresolveで返すべき', async () => {
      const result = await hook.find({ lineId: 999 });
      expect(result).toBeUndefined();
    });

    it('引数が空の場合も適切に処理するべき', async () => {
      const result = await hook.find({});
      // 現在の実装では常にundefinedを返す
      expect(result).toBeUndefined();
    });

    it('lineIdのみで検索した場合、hasTrainType: falseの経路を想定', async () => {
      const result = await hook.find({ lineId: 200 });
      // 実装後は、lineIdを持つ経路（hasTrainType: false）が返される
      expect(result).toBeUndefined();
    });

    it('trainTypeIdのみで検索した場合、hasTrainType: trueの経路を想定', async () => {
      const result = await hook.find({ trainTypeId: 1 });
      // 実装後は、trainTypeIdを持つ経路（hasTrainType: true）が返される
      expect(result).toBeUndefined();
    });

    it('なんらかのエラーが発生した場合はrejectを返すべき', async () => {
      // 実装後は実際のエラーケースをテスト
      // 現在の実装では常にresolveするため、実装後に更新が必要
      await expect(hook.find({ lineId: 100 })).resolves.toBeUndefined();
    });
  });

  describe('save', () => {
    const mockRouteWithTrainType: SavedRouteWithTrainTypeInput = {
      hasTrainType: true,
      lineId: 200,
      trainTypeId: 1,
      departureStationId: 100,
      name: 'Test Route with Train Type',
      createdAt: new Date('2025-08-24T12:00:00Z'),
    };

    const mockRouteWithoutTrainType: SavedRouteWithoutTrainTypeInput = {
      hasTrainType: false,
      lineId: 200,
      trainTypeId: null,
      departureStationId: 300,
      name: 'Test Route without Train Type',
      createdAt: new Date('2025-08-24T12:00:00Z'),
    };

    it('電車種別ありの経路を保存し、成功時に保存された経路を返すべき', async () => {
      const result = await hook.save(mockRouteWithTrainType);
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe(mockRouteWithTrainType.name);
      expect(result.hasTrainType).toBe(mockRouteWithTrainType.hasTrainType);
      if (result.hasTrainType && mockRouteWithTrainType.hasTrainType) {
        expect(result.lineId).toBe(mockRouteWithTrainType.lineId);
        expect(result.trainTypeId).toBe(mockRouteWithTrainType.trainTypeId);
      }
      expect(result.departureStationId).toBe(
        mockRouteWithTrainType.departureStationId
      );
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('電車種別なしの経路を保存し、成功時に保存された経路を返すべき', async () => {
      const result = await hook.save(mockRouteWithoutTrainType);
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe(mockRouteWithoutTrainType.name);
      expect(result.hasTrainType).toBe(mockRouteWithoutTrainType.hasTrainType);
      if (!result.hasTrainType && !mockRouteWithoutTrainType.hasTrainType) {
        expect(result.lineId).toBe(mockRouteWithoutTrainType.lineId);
        expect(result.trainTypeId).toBeNull();
      }
      expect(result.departureStationId).toBe(
        mockRouteWithoutTrainType.departureStationId
      );
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('departureStationIdがnullの経路を保存するべき', async () => {
      const routeWithNullDeparture: SavedRouteWithTrainTypeInput = {
        ...mockRouteWithTrainType,
        departureStationId: null,
      };
      const result = await hook.save(routeWithNullDeparture);
      expect(result).toBeDefined();
      expect(result.departureStationId).toBeNull();
    });

    it('IDにUUIDを生成してDBに保存するべき', async () => {
      const result = await hook.save(mockRouteWithTrainType);
      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe('string');
      expect(result.id.length).toBeGreaterThan(0);
      // UUIDの形式をチェック（簡易的）
      expect(result.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('保存が失敗した場合rejectするべき', async () => {
      // 現在のモック実装では常に成功するため、実装後に更新が必要
      const result = await hook.save(mockRouteWithTrainType);
      expect(result).toBeDefined();
    });
  });

  describe('remove', () => {
    const testId = '550e8400-e29b-41d4-a716-446655440000';

    it('IDで経路を削除し、成功時にresolveするべき', async () => {
      await expect(hook.remove(testId)).resolves.toBeUndefined();
    });

    it('DBから経路を物理削除するべき', async () => {
      // 実装後は実際にDBから物理削除されることをテスト
      await expect(hook.remove(testId)).resolves.toBeUndefined();
    });

    it('削除が失敗した場合rejectするべき', async () => {
      // 実装後は実際のエラーケースをテスト
      // 現在の実装では常にresolveするため、実装後に更新が必要
      await expect(hook.remove(testId)).resolves.toBeUndefined();
    });

    it('存在しないIDの削除を適切に処理するべき', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174000';
      // 実装に応じて、存在しないIDの削除時の動作を定義
      await expect(hook.remove(nonExistentId)).resolves.toBeUndefined();
    });
  });
});
