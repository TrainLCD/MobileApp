import { randomUUID } from 'expo-crypto';
import * as SQLite from 'expo-sqlite';
import { useAtomValue, useSetAtom } from 'jotai';
import { useCallback, useEffect } from 'react';
import {
  type SavedRoute,
  type SavedRouteInput,
  type SavedRouteLeg,
  SavedRouteLegSchema,
} from '~/models/SavedRoute';
import navigationState, {
  presetRoutesAtom,
  presetsFetchedAtom,
} from '~/store/atoms/navigation';
import { isSameSavedRouteLegs } from '~/utils/transferRoutePreset';

// SQLiteの行データ型を定義
interface SavedRouteRow {
  id: string;
  name: string;
  lineId: number;
  trainTypeId: number | null;
  wantedDestinationId: number | null;
  originStationId: number | null;
  direction: string | null;
  notifyStationIds: string | null; // JSON文字列として保存
  legs: string | null; // 乗換のある経路の区間。JSON文字列として保存
  hasTrainType: number; // SQLiteではBOOLEANが数値として保存される
  createdAt: string; // SQLiteでは日時が文字列として保存される
}

const db = SQLite.openDatabaseSync('savedRoutes.db');

const parseDirection = (
  value: string | null
): 'INBOUND' | 'OUTBOUND' | null => {
  if (value === 'INBOUND' || value === 'OUTBOUND') return value;
  return null;
};

const parseNotifyStationIds = (value: string | null): number[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Number.isFinite) : [];
  } catch {
    return [];
  }
};

const LegsSchema = SavedRouteLegSchema.array().min(2);

// 乗換のない経路は undefined、壊れた値は null
const parseLegs = (
  value: string | null
): SavedRouteLeg[] | null | undefined => {
  if (!value) return undefined;
  try {
    const parsed = LegsSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

// SQLiteの行データを SavedRoute に変換（不正データは null を返す）
const convertRowToSavedRoute = (row: SavedRouteRow): SavedRoute | null => {
  const hasTrainType = Boolean(row.hasTrainType);
  const direction = parseDirection(row.direction);
  const notifyStationIds = parseNotifyStationIds(row.notifyStationIds);
  const legs = parseLegs(row.legs ?? null);

  if (hasTrainType) {
    // 破損データは読み飛ばす。区間を読めない乗換経路を最初の区間だけの経路として開かない
    if (row.trainTypeId === null || legs === null) {
      return null;
    }
    return {
      id: row.id,
      name: row.name,
      lineId: row.lineId,
      trainTypeId: row.trainTypeId,
      wantedDestinationId: row.wantedDestinationId ?? null,
      originStationId: row.originStationId ?? null,
      direction,
      notifyStationIds,
      ...(legs ? { legs } : {}),
      hasTrainType: true,
      createdAt: new Date(row.createdAt),
    };
  }
  return {
    id: row.id,
    name: row.name,
    lineId: row.lineId,
    trainTypeId: null,
    wantedDestinationId: row.wantedDestinationId ?? null,
    originStationId: row.originStationId ?? null,
    direction,
    notifyStationIds,
    hasTrainType: false,
    createdAt: new Date(row.createdAt),
  };
};

// モジュールスコープで初期化 Promise を保持し、並行実行を防ぐ
let initPromise: Promise<void> | null = null;

const initDb = async (): Promise<void> => {
  await db.execAsync(
    `CREATE TABLE IF NOT EXISTS saved_routes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    lineId INTEGER NOT NULL,
    trainTypeId INTEGER,
    wantedDestinationId INTEGER,
    originStationId INTEGER,
    direction TEXT,
    notifyStationIds TEXT,
    legs TEXT,
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
  // 既存テーブルにカラムを追加（存在しない場合のみ）
  const columns = (await db.getAllAsync(
    "PRAGMA table_info('saved_routes')"
  )) as { name: string }[];
  const columnNames = new Set(columns.map((c) => c.name));
  if (!columnNames.has('wantedDestinationId')) {
    await db.execAsync(
      'ALTER TABLE saved_routes ADD COLUMN wantedDestinationId INTEGER;'
    );
  }
  if (!columnNames.has('originStationId')) {
    await db.execAsync(
      'ALTER TABLE saved_routes ADD COLUMN originStationId INTEGER;'
    );
  }
  if (!columnNames.has('direction')) {
    await db.execAsync('ALTER TABLE saved_routes ADD COLUMN direction TEXT;');
  }
  if (!columnNames.has('notifyStationIds')) {
    await db.execAsync(
      'ALTER TABLE saved_routes ADD COLUMN notifyStationIds TEXT;'
    );
  }
  if (!columnNames.has('legs')) {
    await db.execAsync('ALTER TABLE saved_routes ADD COLUMN legs TEXT;');
  }
};

const ensureDbInitialized = (): Promise<void> => {
  if (!initPromise) {
    initPromise = initDb().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
};

export const useSavedRoutes = () => {
  const routes = useAtomValue(presetRoutesAtom);
  const isInitialized = useAtomValue(presetsFetchedAtom);
  const setNavigationAtom = useSetAtom(navigationState);

  useEffect(() => {
    ensureDbInitialized()
      .then(() => {
        setNavigationAtom((prev) => ({ ...prev, presetsFetched: true }));
      })
      .catch((err) => {
        console.error('useSavedRoutes: DB初期化に失敗しました', err);
        setNavigationAtom((prev) => ({ ...prev, presetsFetched: true }));
      });
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
      wantedDestinationId,
      legs,
    }: {
      lineId: number | null;
      trainTypeId: number | null;
      wantedDestinationId: number | null;
      /** 乗換のある経路の区間。指定すると区間が同じプリセットだけを探す */
      legs?: SavedRouteLeg[] | null;
    }): SavedRoute | null => {
      if (legs) {
        return (
          routes.find(
            (r) =>
              r.hasTrainType &&
              !!r.legs &&
              isSameSavedRouteLegs(r.legs, legs) &&
              r.wantedDestinationId === wantedDestinationId
          ) ?? null
        );
      }
      if (trainTypeId !== null) {
        // 種別指定で検索する場合、trainTypeId（lineGroupId）のみで一意に識別できる
        // lineIdは経路の中間駅で異なる可能性があるため比較しない
        return (
          routes.find(
            (r) =>
              r.hasTrainType &&
              // 乗換経路のプリセットは最初の区間の系統を持つが、その系統だけの経路とは別物
              !r.legs &&
              r.trainTypeId === trainTypeId &&
              r.wantedDestinationId === wantedDestinationId
          ) ?? null
        );
      }
      // trainTypeId === null の場合は lineId が必須
      if (lineId === null) {
        return null;
      }
      // lineId が一致し、hasTrainType: false の経路を検索
      return (
        routes.find(
          (r) =>
            r.lineId === lineId &&
            !r.hasTrainType &&
            r.wantedDestinationId === wantedDestinationId
        ) ?? null
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
         (id, name, lineId, trainTypeId, wantedDestinationId, originStationId, direction, notifyStationIds, legs, hasTrainType, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newRoute.id,
          newRoute.name,
          newRoute.lineId,
          newRoute.trainTypeId ?? null,
          newRoute.wantedDestinationId ?? null,
          newRoute.originStationId ?? null,
          newRoute.direction ?? null,
          newRoute.notifyStationIds.length
            ? JSON.stringify(newRoute.notifyStationIds)
            : null,
          newRoute.hasTrainType && newRoute.legs
            ? JSON.stringify(newRoute.legs)
            : null,
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
