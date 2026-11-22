import {
  type SavedRoute,
  type SavedRouteLeg,
  SavedRouteLegSchema,
  SavedRouteSchema,
} from '~/models/SavedRoute';

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

// 旧版の列が欠けていても変換時の既定値で補う。移行元は変更しない。
export const readLegacySavedRoutes = async (): Promise<SavedRoute[]> => {
  const SQLite = require('expo-sqlite') as typeof import('expo-sqlite');
  const db = await SQLite.openDatabaseAsync('savedRoutes.db');
  try {
    const columns = await db.getAllAsync("PRAGMA table_info('saved_routes')");
    if (!columns.length) return [];
    const rows = await db.getAllAsync<SavedRouteRow>(
      'SELECT * FROM saved_routes ORDER BY createdAt DESC'
    );
    return (
      rows
        .map(convertRowToSavedRoute)
        // 不正な行が正常なプリセットの移行まで妨げないよう、行ごとに検証する。
        .filter(
          (r): r is SavedRoute =>
            r !== null && SavedRouteSchema.safeParse(r).success
        )
    );
  } finally {
    await db.closeAsync();
  }
};
