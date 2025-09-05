import { randomUUID } from 'expo-crypto';
import * as SQLite from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import type { SavedRoute, SavedRouteInput } from '~/models/SavedRoute';

// SQLiteの行データ型を定義
interface SavedRouteRow {
  id: string;
  name: string;
  lineId: number;
  trainTypeId: number | null;
  destinationStationId: number | null;
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
      destinationStationId: row.destinationStationId,
      hasTrainType: true,
      createdAt: new Date(row.createdAt),
    };
  }
  return {
    id: row.id,
    name: row.name,
    lineId: row.lineId,
    trainTypeId: null,
    destinationStationId: row.destinationStationId,
    hasTrainType: false,
    createdAt: new Date(row.createdAt),
  };
};

export const useSavedRoutes = () => {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    db.execSync(
      `CREATE TABLE IF NOT EXISTS saved_routes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        lineId INTEGER NOT NULL,
        trainTypeId INTEGER,
        destinationStationId INTEGER,
        hasTrainType INTEGER NOT NULL CHECK (hasTrainType IN (0,1)),
        createdAt TEXT NOT NULL,
        CHECK ((hasTrainType = 1 AND trainTypeId IS NOT NULL) OR (hasTrainType = 0 AND trainTypeId IS NULL))
      );`
    );
    // よく使う検索条件に合わせて索引を付与
    db.execSync(
      'CREATE INDEX IF NOT EXISTS idx_saved_routes_createdAt ON saved_routes(createdAt DESC);'
    );
    db.execSync(
      'CREATE INDEX IF NOT EXISTS idx_saved_routes_line_dest_has ON saved_routes(lineId, destinationStationId, hasTrainType, createdAt DESC);'
    );
    db.execSync(
      'CREATE INDEX IF NOT EXISTS idx_saved_routes_ttype_dest_has ON saved_routes(trainTypeId, destinationStationId, hasTrainType, createdAt DESC);'
    );
    setIsInitialized(true);
  }, []);

  const getAll = useCallback(async (): Promise<SavedRoute[]> => {
    const rows = (await db.getAllAsync(
      'SELECT * FROM saved_routes ORDER BY createdAt DESC'
    )) as SavedRouteRow[];

    return rows
      .map(convertRowToSavedRoute)
      .filter((r): r is SavedRoute => r !== null);
  }, []);

  const find = useCallback(
    async ({
      lineId,
      trainTypeId,
      destinationStationId,
    }: {
      lineId: number | null;
      destinationStationId: number | null;
      trainTypeId: number | null;
    }): Promise<SavedRoute | undefined> => {
      let sql = '';
      let params: (number | null)[] = [];

      if (trainTypeId !== null) {
        // 種別ベース: hasTrainType=1 を明示し最新から
        if (destinationStationId !== null) {
          sql =
            'SELECT * FROM saved_routes WHERE hasTrainType = 1 AND trainTypeId = ? AND destinationStationId = ? ORDER BY createdAt DESC LIMIT 1';
          params = [trainTypeId, destinationStationId];
        } else {
          sql =
            'SELECT * FROM saved_routes WHERE hasTrainType = 1 AND trainTypeId = ? AND destinationStationId IS NULL ORDER BY createdAt DESC LIMIT 1';
          params = [trainTypeId];
        }
      } else {
        // 線ベース: hasTrainType=0 を明示。lineIdは必須
        if (lineId == null) {
          return undefined;
        }
        if (destinationStationId !== null) {
          sql =
            'SELECT * FROM saved_routes WHERE hasTrainType = 0 AND lineId = ? AND destinationStationId = ? ORDER BY createdAt DESC LIMIT 1';
          params = [lineId, destinationStationId];
        } else {
          sql =
            'SELECT * FROM saved_routes WHERE hasTrainType = 0 AND lineId = ? AND destinationStationId IS NULL ORDER BY createdAt DESC LIMIT 1';
          params = [lineId];
        }
      }

      const row = (await db.getFirstAsync(sql, params)) as SavedRouteRow | null;
      const converted = row ? convertRowToSavedRoute(row) : null;
      return converted ?? undefined;
    },
    []
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
         (id, name, lineId, trainTypeId, destinationStationId, hasTrainType, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          newRoute.id,
          newRoute.name,
          newRoute.lineId,
          newRoute.trainTypeId ?? null,
          newRoute.destinationStationId ?? null,
          newRoute.hasTrainType ? 1 : 0,
          newRoute.createdAt.toISOString(),
        ]
      );

      return newRoute;
    },
    []
  );

  const remove = useCallback(async (id: string): Promise<void> => {
    await db.runAsync('DELETE FROM saved_routes WHERE id = ?', [id]);
  }, []);

  return { getAll, find, save, remove, isInitialized };
};
