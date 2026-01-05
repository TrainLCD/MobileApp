import { randomUUID } from 'expo-crypto';
import * as SQLite from 'expo-sqlite';
import { useAtom } from 'jotai';
import { useCallback, useEffect } from 'react';
import type { SavedRoute, SavedRouteInput } from '~/models/SavedRoute';
import navigationState from '~/store/atoms/navigation';

// SQLiteの行データ型を定義
interface SavedRouteRow {
  id: string;
  name: string;
  lineId: number;
  trainTypeId: number | null;
  hasTrainType: number; // SQLiteではBOOLEANが数値として保存される
  createdAt: string; // SQLiteでは日時が文字列として保存される
}

const db = SQLite.openDatabaseSync('savedRoutes.db');

// SQLiteの行データを SavedRoute に変換（不正データは null を返す）
const convertRowToSavedRoute = (row: SavedRouteRow): SavedRoute | null => {
  const hasTrainType = Boolean(row.hasTrainType);

  if (hasTrainType) {
    if (row.trainTypeId === null) {
      // 破損データは読み飛ばす
      return null;
    }
    return {
      id: row.id,
      name: row.name,
      lineId: row.lineId,
      trainTypeId: row.trainTypeId,
      hasTrainType: true,
      createdAt: new Date(row.createdAt),
    };
  }
  return {
    id: row.id,
    name: row.name,
    lineId: row.lineId,
    trainTypeId: null,
    hasTrainType: false,
    createdAt: new Date(row.createdAt),
  };
};

export const useSavedRoutes = () => {
  const [
    { presetRoutes: routes, presetsFetched: isInitialized },
    setNavigationAtom,
  ] = useAtom(navigationState);

  useEffect(() => {
    const initDb = async () => {
      await db.execAsync(
        `CREATE TABLE IF NOT EXISTS saved_routes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        lineId INTEGER NOT NULL,
        trainTypeId INTEGER,
        hasTrainType INTEGER NOT NULL CHECK (hasTrainType IN (0,1)),
        createdAt TEXT NOT NULL,
        CHECK ((hasTrainType = 1 AND trainTypeId IS NOT NULL) OR (hasTrainType = 0 AND trainTypeId IS NULL))
      );`
      );
      // よく使う検索条件に合わせて索引を付与
      await db.execAsync(
        'CREATE INDEX IF NOT EXISTS idx_saved_routes_createdAt ON saved_routes(createdAt DESC);'
      );
      await db.execAsync(
        'CREATE INDEX IF NOT EXISTS idx_saved_routes_line_dest_has ON saved_routes(lineId, hasTrainType, createdAt DESC);'
      );
      await db.execAsync(
        'CREATE INDEX IF NOT EXISTS idx_saved_routes_ttype_dest_has ON saved_routes(trainTypeId, hasTrainType, createdAt DESC);'
      );
      setNavigationAtom((prev) => ({ ...prev, presetsFetched: true }));
    };
    initDb();
  }, [setNavigationAtom]);

  const updateRoutes = useCallback(async (): Promise<void> => {
    const rows = (await db.getAllAsync(
      'SELECT * FROM saved_routes ORDER BY createdAt DESC'
    )) as SavedRouteRow[];

    const presetRoutes = rows
      .map(convertRowToSavedRoute)
      .filter((r): r is SavedRoute => r !== null);

    setNavigationAtom((prev) => ({ ...prev, presetRoutes }));
  }, [setNavigationAtom]);

  const find = useCallback(
    ({
      lineId,
      trainTypeId,
    }: {
      lineId: number | null;
      trainTypeId: number | null;
    }): SavedRoute | null => {
      return (
        routes.find((r) => {
          if (trainTypeId !== null) {
            // 種別指定で検索する場合、trainTypeId（lineGroupId）のみで一意に識別できる
            // lineIdは経路の中間駅で異なる可能性があるため比較しない
            return r.hasTrainType && r.trainTypeId === trainTypeId;
          }
          // trainTypeId === null の場合、lineId が一致し、hasTrainType: false の経路を検索
          return r.lineId === lineId && !r.hasTrainType;
        }) ?? null
      );
    },
    [routes]
  );

  const save = useCallback(
    async (route: SavedRouteInput): Promise<SavedRoute> => {
      const normalizedTrainTypeId = route.hasTrainType
        ? (route as SavedRoute).trainTypeId
        : null;
      const newRoute = {
        ...route,
        trainTypeId: normalizedTrainTypeId,
        id: randomUUID(),
        createdAt: new Date(),
      } as SavedRoute;

      await db.runAsync(
        `INSERT INTO saved_routes 
         (id, name, lineId, trainTypeId, hasTrainType, createdAt)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          newRoute.id,
          newRoute.name,
          newRoute.lineId,
          newRoute.trainTypeId ?? null,
          newRoute.hasTrainType ? 1 : 0,
          newRoute.createdAt.toISOString(),
        ]
      );

      setNavigationAtom((prev) => ({
        ...prev,
        presetRoutes: [newRoute, ...prev.presetRoutes],
      }));
      return newRoute;
    },
    [setNavigationAtom]
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      await db.runAsync('DELETE FROM saved_routes WHERE id = ?', [id]);
      setNavigationAtom((prev) => ({
        ...prev,
        presetRoutes: prev.presetRoutes.filter((r) => r.id !== id),
      }));
    },
    [setNavigationAtom]
  );

  return { isInitialized, routes, updateRoutes, find, save, remove };
};
