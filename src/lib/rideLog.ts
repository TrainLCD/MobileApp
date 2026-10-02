import * as SQLite from 'expo-sqlite';

/**
 * 振り返り機能(#5751)の乗車ログ。端末内の SQLite にだけ保存し、サーバには送らない。
 * 利用者の位置の座標は保存せず、検出した駅と時刻、その駅の座標だけを持つ。
 * 時刻はエポックミリ秒で持ち、週・月・年への振り分けは集計側が端末のタイムゾーンで行う。
 */

const RIDE_STOP_KINDS = ['arrived', 'passed'] as const;
export type RideStopKind = (typeof RIDE_STOP_KINDS)[number];

// 距離の求め方。haversine は隣り合う駅どうしの直線距離の合計、track は StationAPI の
// 線路の長さの合計(#7103)、mixed は線路の長さが無い区間だけ直線距離で代えたもの。
// 線路の長さに切り替える前に記録した行と見分けられるよう、行ごとに持つ
// 取りうる値はこの配列から型と判定の両方を作る。値を足すときはここに足す
const RIDE_DISTANCE_SOURCES = ['haversine', 'track', 'mixed'] as const;
export type RideDistanceSource = (typeof RIDE_DISTANCE_SOURCES)[number];

export type RideSessionRecord = {
  id: string;
  // 出発駅を発車した時刻。発車を検出できなかった場合は Main 画面を開いた時刻
  startedAt: number;
  // 最後に到着を検出した時刻
  endedAt: number;
  lineId: number | null;
  lineName: string | null;
  lineColor: string | null;
  trainTypeId: number | null;
  direction: string | null;
};

// 駅の座標。利用者の位置ではなく、StationAPI が返す駅の位置
export type RideCoordinate = { latitude: number; longitude: number };

export type RideStopRecord = {
  seq: number;
  stationId: number;
  stationGroupId: number | null;
  stationName: string | null;
  // 駅データが後から変わっても過去の記録を表示できるよう、路線名と路線色も残す
  lineId: number | null;
  lineName: string | null;
  lineColor: string | null;
  kind: RideStopKind;
  // 出発駅は到着を観測していないので null
  arrivedAt: number | null;
  departedAt: number | null;
  // 直前に記録した駅からの距離(メートル)。出発駅は 0
  distanceFromPrevious: number;
  distanceSource: RideDistanceSource;
  // 移動経路の地図に使う駅の座標。座標を保存する前に記録した行と、駅データに
  // 座標が無い駅は null
  latitude: number | null;
  longitude: number | null;
  // 直前に記録した駅からこの駅までのあいだに通った駅の座標(両端を含まない)。
  // 検出できなかった駅を、距離と同じく乗車中の駅リストでたどって埋める。
  // 座標を保存する前に記録した行は null
  pathFromPrevious: RideCoordinate[] | null;
  // 駅の都道府県(StationAPI の prefectureId。1〜47 で、src/constants/province.ts の
  // PREFECTURES_JA などを prefectureId - 1 で引く)。都道府県の列を足す前に記録した行と、
  // 駅データに都道府県が無い駅は null
  prefectureId: number | null;
};

// DB は最初に使うときに開く。設定画面など記録しない画面からも import されるため、
// モジュールの読み込みだけでファイルを開かないようにする
let dbInstance: SQLite.SQLiteDatabase | null = null;
const getDb = (): SQLite.SQLiteDatabase => {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync('rides.db');
  }
  return dbInstance;
};

const initDb = async (): Promise<void> => {
  const db = getDb();
  // 外部キー制約は接続ごとの設定なので、開くたびに有効化する
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync(
    `CREATE TABLE IF NOT EXISTS ride_sessions (
    id TEXT PRIMARY KEY,
    startedAt INTEGER NOT NULL,
    endedAt INTEGER NOT NULL,
    lineId INTEGER,
    lineName TEXT,
    lineColor TEXT,
    trainTypeId INTEGER,
    direction TEXT
  );`
  );
  await db.execAsync(
    `CREATE TABLE IF NOT EXISTS ride_stops (
    sessionId TEXT NOT NULL REFERENCES ride_sessions(id) ON DELETE CASCADE,
    seq INTEGER NOT NULL,
    stationId INTEGER NOT NULL,
    stationGroupId INTEGER,
    stationName TEXT,
    lineId INTEGER,
    lineName TEXT,
    lineColor TEXT,
    kind TEXT NOT NULL CHECK (kind IN ('arrived', 'passed')),
    arrivedAt INTEGER,
    departedAt INTEGER,
    distanceFromPrevious REAL NOT NULL DEFAULT 0,
    distanceSource TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    pathFromPrevious TEXT,
    prefectureId INTEGER,
    PRIMARY KEY (sessionId, seq)
  );`
  );
  // 移動経路の地図のために後から足した列。それより前に作ったテーブルに足す。
  // 既存の行は null のままにする(当時の駅リストが残っておらず埋められないため)
  const columns = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info('ride_stops')"
  );
  const columnNames = new Set(columns.map((c) => c.name));
  if (!columnNames.has('latitude')) {
    await db.execAsync('ALTER TABLE ride_stops ADD COLUMN latitude REAL;');
  }
  if (!columnNames.has('longitude')) {
    await db.execAsync('ALTER TABLE ride_stops ADD COLUMN longitude REAL;');
  }
  if (!columnNames.has('pathFromPrevious')) {
    await db.execAsync(
      'ALTER TABLE ride_stops ADD COLUMN pathFromPrevious TEXT;'
    );
  }
  // 都道府県ごとの集計(#7123)のために後から足した列
  if (!columnNames.has('prefectureId')) {
    await db.execAsync(
      'ALTER TABLE ride_stops ADD COLUMN prefectureId INTEGER;'
    );
  }
  // 期間ごとの集計は乗りはじめた時刻で絞り込む
  await db.execAsync(
    'CREATE INDEX IF NOT EXISTS idx_ride_sessions_startedAt ON ride_sessions(startedAt);'
  );
};

// モジュールスコープで初期化 Promise を保持し、並行実行を防ぐ
let initPromise: Promise<void> | null = null;

export const ensureRideLogDbInitialized = (): Promise<void> => {
  if (!initPromise) {
    initPromise = initDb().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
};

// 乗車ログへの書き込みと削除を1本の列に並べる。記録用のフックが Main 画面を
// 抜けるときに積んだ最後の書き込みより先に全件削除が走ると、削除した乗車が
// その書き込みで作り直されてしまうため、両方をここに通して順序を保つ。
let mutationQueue: Promise<void> = Promise.resolve();

/**
 * 乗車ログを変更する処理を、先に積まれた処理が終わってから実行する。
 * 返り値の Promise は task の結果をそのまま返す。失敗しても後続の処理は止めない。
 */
export const enqueueRideLogMutation = (
  task: () => Promise<void>
): Promise<void> => {
  const result = mutationQueue.then(task);
  mutationQueue = result.catch(() => undefined);
  return result;
};

// 経路の座標は [緯度, 経度] の配列の JSON で持つ(行数が多くなる年の読み出しを軽くするため)
const serializePath = (path: RideCoordinate[]): string =>
  JSON.stringify(path.map((c) => [c.latitude, c.longitude]));

// 壊れた値や想定外の形の値は、経路が無いものとして扱う
const parsePath = (value: string | null): RideCoordinate[] | null => {
  if (value == null) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return null;
    }
    const path: RideCoordinate[] = [];
    for (const item of parsed) {
      if (
        !Array.isArray(item) ||
        typeof item[0] !== 'number' ||
        typeof item[1] !== 'number'
      ) {
        return null;
      }
      path.push({ latitude: item[0], longitude: item[1] });
    }
    return path;
  } catch {
    return null;
  }
};

const insertStop = (sessionId: string, stop: RideStopRecord) =>
  getDb().runAsync(
    `INSERT INTO ride_stops (sessionId, seq, stationId, stationGroupId, stationName, lineId, lineName, lineColor, kind, arrivedAt, departedAt, distanceFromPrevious, distanceSource, latitude, longitude, pathFromPrevious, prefectureId)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      sessionId,
      stop.seq,
      stop.stationId,
      stop.stationGroupId,
      stop.stationName,
      stop.lineId,
      stop.lineName,
      stop.lineColor,
      stop.kind,
      stop.arrivedAt,
      stop.departedAt,
      stop.distanceFromPrevious,
      stop.distanceSource,
      stop.latitude,
      stop.longitude,
      stop.pathFromPrevious ? serializePath(stop.pathFromPrevious) : null,
      stop.prefectureId,
    ]
  );

/**
 * 乗車が確定した時点で、セッションとそれまでに検出した駅をまとめて書く。
 * 途中で失敗したときに駅の無いセッションが残らないよう、1トランザクションで行う。
 */
export const insertRideSession = async (
  session: RideSessionRecord,
  stops: RideStopRecord[]
): Promise<void> => {
  await ensureRideLogDbInitialized();
  const db = getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO ride_sessions (id, startedAt, endedAt, lineId, lineName, lineColor, trainTypeId, direction)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        session.id,
        session.startedAt,
        session.endedAt,
        session.lineId,
        session.lineName,
        session.lineColor,
        session.trainTypeId,
        session.direction,
      ]
    );
    for (const stop of stops) {
      await insertStop(session.id, stop);
    }
  });
};

/**
 * 確定済みのセッションに駅を1つ足す。到着した駅なら終了時刻も進める。
 * アプリが終了されても最後の到着までが残るよう、検出のたびに書く。
 */
export const appendRideStop = async (
  sessionId: string,
  stop: RideStopRecord
): Promise<void> => {
  await ensureRideLogDbInitialized();
  const db = getDb();
  await db.withTransactionAsync(async () => {
    await insertStop(sessionId, stop);
    if (stop.kind === 'arrived' && stop.arrivedAt != null) {
      await db.runAsync('UPDATE ride_sessions SET endedAt = ? WHERE id = ?', [
        stop.arrivedAt,
        sessionId,
      ]);
    }
  });
};

/**
 * 記録済みの駅に発車時刻を書く。駅の到着圏を出入りすると複数回呼ばれるので、
 * 最後に出た時刻で上書きする。
 */
export const updateRideStopDeparture = async (
  sessionId: string,
  seq: number,
  departedAt: number
): Promise<void> => {
  await ensureRideLogDbInitialized();
  const db = getDb();
  await db.runAsync(
    'UPDATE ride_stops SET departedAt = ? WHERE sessionId = ? AND seq = ?',
    [departedAt, sessionId, seq]
  );
};

/**
 * 保存済みの乗車ログをすべて削除する。設定画面の「記録をすべて削除」から呼ぶ。
 * 駅の行は外部キーの ON DELETE CASCADE で一緒に消える。
 * 記録の書き込みと同じ列に並べるので、先に積まれた書き込みが終わってから消す。
 */
export const deleteAllRideLogs = (): Promise<void> =>
  enqueueRideLogMutation(async () => {
    await ensureRideLogDbInitialized();
    const db = getDb();
    await db.execAsync('DELETE FROM ride_sessions;');
  });

/**
 * 保存済みの乗車ログが1件でもあるか。設定画面の「記録をすべて削除」を押せるかに使う。
 * 記録の書き込みと同じ列に並べ、先に積まれた書き込みが終わってから読む。
 * Main 画面を抜けた直後に最後の書き込みが残っていても、書いた後の状態を返すため。
 */
export const hasRideLogs = (): Promise<boolean> =>
  new Promise<boolean>((resolve, reject) => {
    enqueueRideLogMutation(async () => {
      await ensureRideLogDbInitialized();
      const row = await getDb().getFirstAsync<{ found: number }>(
        'SELECT 1 AS found FROM ride_sessions LIMIT 1'
      );
      resolve(row != null);
    }).catch(reject);
  });

export type RideSessionWithStops = RideSessionRecord & {
  stops: RideStopRecord[];
};

type RideStopRow = Omit<
  RideStopRecord,
  'kind' | 'distanceSource' | 'pathFromPrevious'
> & {
  sessionId: string;
  kind: string;
  distanceSource: string;
  pathFromPrevious: string | null;
};

const isRideStopKind = (value: string): value is RideStopKind =>
  (RIDE_STOP_KINDS as readonly string[]).includes(value);

const isRideDistanceSource = (value: string): value is RideDistanceSource =>
  (RIDE_DISTANCE_SOURCES as readonly string[]).includes(value);

/**
 * 乗りはじめた時刻が [start, end) に入る乗車を、駅の並び付きで読み出す。
 * 集計(src/utils/rideStats.ts)の入力になる。
 */
export const getRideSessionsStartedBetween = async (
  start: number,
  end: number
): Promise<RideSessionWithStops[]> => {
  await ensureRideLogDbInitialized();
  const db = getDb();
  const sessions = await db.getAllAsync<RideSessionRecord>(
    'SELECT id, startedAt, endedAt, lineId, lineName, lineColor, trainTypeId, direction FROM ride_sessions WHERE startedAt >= ? AND startedAt < ? ORDER BY startedAt',
    [start, end]
  );
  if (sessions.length === 0) {
    return [];
  }
  const rows = await db.getAllAsync<RideStopRow>(
    `SELECT s.sessionId, s.seq, s.stationId, s.stationGroupId, s.stationName, s.lineId, s.lineName, s.lineColor, s.kind, s.arrivedAt, s.departedAt, s.distanceFromPrevious, s.distanceSource, s.latitude, s.longitude, s.pathFromPrevious, s.prefectureId
    FROM ride_stops s JOIN ride_sessions r ON r.id = s.sessionId
    WHERE r.startedAt >= ? AND r.startedAt < ?
    ORDER BY s.sessionId, s.seq`,
    [start, end]
  );
  const stopsBySession = new Map<string, RideStopRecord[]>();
  for (const {
    sessionId,
    kind,
    distanceSource,
    pathFromPrevious,
    ...rest
  } of rows) {
    // 想定外の値の行は読み飛ばす(このバージョンが知らない値の行を誤って集計しないため)
    if (!isRideStopKind(kind) || !isRideDistanceSource(distanceSource)) {
      continue;
    }
    const list = stopsBySession.get(sessionId) ?? [];
    list.push({
      ...rest,
      kind,
      distanceSource,
      pathFromPrevious: parsePath(pathFromPrevious),
    });
    stopsBySession.set(sessionId, list);
  }
  return sessions.map((session) => ({
    ...session,
    stops: stopsBySession.get(session.id) ?? [],
  }));
};
