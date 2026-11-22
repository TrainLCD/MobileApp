import { type SavedRoute, SavedRouteSchema } from '~/models/SavedRoute';
import { storage } from './storage';

// 値そのものを移行完了の印にする。空配列も保存し、削除済みの経路を復活させない。
export const SAVED_ROUTES_KEY = '@TrainLCD:savedRoutes:v1';

export const readSavedRoutes = (): SavedRoute[] | null => {
  const value = storage.getString(SAVED_ROUTES_KEY);
  if (value === undefined) return null;
  const rows: unknown = JSON.parse(value);
  if (!Array.isArray(rows)) throw new Error('Invalid saved routes');
  return rows.map((row) =>
    SavedRouteSchema.parse({
      ...row,
      createdAt: new Date(row.createdAt),
    })
  );
};

export const writeSavedRoutes = (routes: SavedRoute[]): void => {
  const validated = SavedRouteSchema.array().parse(routes);
  storage.set(SAVED_ROUTES_KEY, JSON.stringify(validated));
};

let migrationPromise: Promise<void> | null = null;

export const migrateSavedRoutes = (): Promise<void> => {
  if (storage.contains(SAVED_ROUTES_KEY)) return Promise.resolve();
  if (!migrationPromise) {
    migrationPromise = (async () => {
      const { readLegacySavedRoutes } =
        require('./legacySavedRoutes') as typeof import('./legacySavedRoutes');
      const routes = await readLegacySavedRoutes();
      if (!storage.contains(SAVED_ROUTES_KEY)) writeSavedRoutes(routes);
    })().finally(() => {
      migrationPromise = null;
    });
  }
  return migrationPromise;
};
