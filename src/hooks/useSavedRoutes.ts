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

// SQLiteの行データを SavedRoute に変換するヘルパー関数
const convertRowToSavedRoute = (row: SavedRouteRow): SavedRoute => {
  const hasTrainType = Boolean(row.hasTrainType);

  if (hasTrainType) {
    if (row.trainTypeId === null) {
      throw new Error('trainTypeId cannot be null when hasTrainType is true');
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
        hasTrainType BOOLEAN NOT NULL,
        createdAt TEXT NOT NULL
      );`
    );
    setIsInitialized(true);
  }, []);

  const getAll = useCallback(async (): Promise<SavedRoute[]> => {
    const rows = (await db.getAllAsync(
      'SELECT * FROM saved_routes ORDER BY createdAt DESC'
    )) as SavedRouteRow[];

    return rows.map(convertRowToSavedRoute);
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
      let whereClause: string;
      let params: (number | null)[];

      if (trainTypeId !== null) {
        // trainTypeIdが指定されている場合
        if (destinationStationId !== null) {
          whereClause = 'trainTypeId = ? AND destinationStationId = ?';
          params = [trainTypeId, destinationStationId];
        } else {
          whereClause = 'trainTypeId = ? AND destinationStationId IS NULL';
          params = [trainTypeId];
        }
      } else {
        // trainTypeIdが指定されていない場合
        if (destinationStationId !== null) {
          whereClause = 'lineId = ? AND destinationStationId = ?';
          params = [lineId, destinationStationId];
        } else {
          whereClause = 'lineId = ? AND destinationStationId IS NULL';
          params = [lineId];
        }
      }

      const row = (await db.getFirstAsync(
        `SELECT * FROM saved_routes WHERE ${whereClause} LIMIT 1`,
        params
      )) as SavedRouteRow | null;

      return row ? convertRowToSavedRoute(row) : undefined;
    },
    []
  );

  const save = useCallback(
    async (route: SavedRouteInput): Promise<SavedRoute> => {
      const newRoute = { ...route, id: randomUUID(), createdAt: new Date() };

      await db.runAsync(
        `INSERT INTO saved_routes 
         (id, name, lineId, trainTypeId, destinationStationId, hasTrainType, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          newRoute.id,
          newRoute.name,
          newRoute.lineId,
          newRoute.trainTypeId,
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
