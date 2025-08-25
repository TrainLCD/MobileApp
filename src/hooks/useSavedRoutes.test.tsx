import { renderHook } from '@testing-library/react-native';
import type {
  SavedRouteWithoutTrainTypeInput,
  SavedRouteWithTrainTypeInput,
} from '~/models/SavedRoute';
import { useSavedRoutes } from './useSavedRoutes';

describe('useSavedRoutes', () => {
  let hook: ReturnType<typeof useSavedRoutes>;

  beforeEach(() => {
    const { result } = renderHook(() => useSavedRoutes());
    hook = result.current;
  });

  describe('getAll', () => {
    it('SavedRouteの配列を返すPromiseを返すべき', async () => {
      const result = await hook.getAll();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([]);
    });

    it('DBからすべての保存済み経路を返すべき', async () => {
      // 実装後は実際のDBから取得されることをテスト
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

    it('電車種別ありの経路を保存し、成功時にresolveするべき', async () => {
      await expect(hook.save(mockRouteWithTrainType)).resolves.toBeUndefined();
    });

    it('電車種別なしの経路を保存し、成功時にresolveするべき', async () => {
      await expect(
        hook.save(mockRouteWithoutTrainType)
      ).resolves.toBeUndefined();
    });

    it('departureStationIdがnullの経路を保存するべき', async () => {
      const routeWithNullDeparture: SavedRouteWithTrainTypeInput = {
        ...mockRouteWithTrainType,
        departureStationId: null,
      };
      await expect(hook.save(routeWithNullDeparture)).resolves.toBeUndefined();
    });

    it('IDにUUIDを生成してDBに保存するべき', async () => {
      // 実装後は実際にUUIDが生成されDBに保存されることをテスト
      await expect(hook.save(mockRouteWithTrainType)).resolves.toBeUndefined();
    });

    it('保存が失敗した場合rejectするべき', async () => {
      // 実装後は実際のエラーケースをテスト
      // 現在の実装では常にresolveするため、実装後に更新が必要
      await expect(hook.save(mockRouteWithTrainType)).resolves.toBeUndefined();
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

  describe('統合テスト', () => {
    it('完全なフロー（保存、存在確認、全取得、削除）が動作するべき', async () => {
      const mockRoute: SavedRouteWithTrainTypeInput = {
        hasTrainType: true,
        lineId: 200,
        trainTypeId: 1,
        departureStationId: 100,
        name: 'Integration Test Route',
        createdAt: new Date('2025-08-24T12:00:00Z'),
      };

      // 初期状態: データが空であることを確認
      const initialRoutes = await hook.getAll();
      const initialCount = initialRoutes.length;

      // 1. 経路を保存 - データが追加されることを確認
      await hook.save(mockRoute);
      const routesAfterSave = await hook.getAll();
      expect(routesAfterSave.length).toBe(initialCount + 1);

      // 保存された経路のIDを取得（実装後はsaveメソッドでIDを返すように変更する可能性もある）
      const savedRoute = routesAfterSave[routesAfterSave.length - 1];
      const savedRouteId = savedRoute.id;

      // 2. 保存された経路が存在することを確認（trainTypeIdで検索）
      if (savedRoute.hasTrainType) {
        const foundRoute = await hook.find({
          trainTypeId: savedRoute.trainTypeId,
        });
        expect(foundRoute).toBeDefined();
        expect(foundRoute?.id).toBe(savedRouteId);
      } else {
        const foundRoute = await hook.find({ lineId: savedRoute.lineId });
        expect(foundRoute).toBeDefined();
        expect(foundRoute?.id).toBe(savedRouteId);
      }

      // 3. getAllで取得した経路のデータが正しいことを確認
      expect(savedRoute.name).toBe(mockRoute.name);
      expect(savedRoute.hasTrainType).toBe(mockRoute.hasTrainType);

      // 型ガードを使用した型安全なテスト
      if (savedRoute.hasTrainType && mockRoute.hasTrainType) {
        // TypeScriptの型ガードにより、ここでは両方ともtrainTypeIdを持つ型になる
        expect(savedRoute.trainTypeId).toBe(mockRoute.trainTypeId);
        expect(savedRoute.lineId).toBe(mockRoute.lineId);
      } else if (!savedRoute.hasTrainType && !mockRoute.hasTrainType) {
        // hasTrainType: falseの場合はtrainTypeIdがnullであることを確認
        expect(savedRoute.trainTypeId).toBeNull();
        expect(savedRoute.lineId).toBe(mockRoute.lineId);
      }
      expect(savedRoute.departureStationId).toBe(mockRoute.departureStationId);

      // 4. 経路を削除 - データが削除されることを確認
      await hook.remove(savedRouteId);
      const routesAfterRemove = await hook.getAll();
      expect(routesAfterRemove.length).toBe(initialCount);

      // 5. 削除後に経路が存在しないことを確認
      const foundRouteAfterRemove = await hook.find({
        trainTypeId: mockRoute.trainTypeId,
      });
      expect(foundRouteAfterRemove).toBeUndefined();
    });

    it('複数経路を正しく処理するべき', async () => {
      const mockRoute1: SavedRouteWithTrainTypeInput = {
        hasTrainType: true,
        lineId: 200,
        trainTypeId: 1,
        departureStationId: 100,
        name: 'Test Route 1',
        createdAt: new Date('2025-08-24T12:00:00Z'),
      };

      const mockRoute2: SavedRouteWithoutTrainTypeInput = {
        hasTrainType: false,
        lineId: 200,
        trainTypeId: null,
        departureStationId: 300,
        name: 'Test Route 2',
        createdAt: new Date('2025-08-24T12:01:00Z'),
      };

      const initialRoutes = await hook.getAll();
      const initialCount = initialRoutes.length;

      // 複数の経路を保存
      await hook.save(mockRoute1);
      await hook.save(mockRoute2);

      // 2つの経路が追加されていることを確認
      const routesAfterSave = await hook.getAll();
      expect(routesAfterSave.length).toBe(initialCount + 2);

      // 両方の経路が存在することを確認
      const route1 = routesAfterSave.find((r) => r.name === mockRoute1.name);
      const route2 = routesAfterSave.find((r) => r.name === mockRoute2.name);

      expect(route1).toBeDefined();
      expect(route2).toBeDefined();

      if (route1 && route2) {
        // 両方の経路が存在することを確認（各経路の特徴で検索）
        const foundRoute1 = await hook.find({
          trainTypeId: mockRoute1.trainTypeId,
        });
        const foundRoute2 = await hook.find({ lineId: mockRoute2.lineId });
        expect(foundRoute1).toBeDefined();
        expect(foundRoute2).toBeDefined();

        // 1つの経路のみ削除
        await hook.remove(route1.id);

        const routesAfterRemove = await hook.getAll();
        expect(routesAfterRemove.length).toBe(initialCount + 1);

        // 削除した経路は存在しない、残った経路は存在する
        const foundRoute1AfterRemove = await hook.find({
          trainTypeId: mockRoute1.trainTypeId,
        });
        const foundRoute2AfterRemove = await hook.find({
          lineId: mockRoute2.lineId,
        });
        expect(foundRoute1AfterRemove).toBeUndefined();
        expect(foundRoute2AfterRemove).toBeDefined();

        // 残りの経路も削除
        await hook.remove(route2.id);

        const finalRoutes = await hook.getAll();
        expect(finalRoutes.length).toBe(initialCount);
        const foundRoute2Final = await hook.find({ lineId: mockRoute2.lineId });
        expect(foundRoute2Final).toBeUndefined();
      }
    });
  });
});
