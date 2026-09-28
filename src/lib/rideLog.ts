import * as SQLite from 'expo-sqlite';

/**
 * 振り返り機能(#5751)の乗車ログ。端末内の SQLite にだけ保存し、サーバには送らない。
 * 利用者の位置の座標は保存せず、検出した駅と時刻だけを持つ。
 * 時刻はエポックミリ秒で持ち、週・月・年への振り分けは集計側が端末のタイムゾーンで行う。
 */

export type RideStopKind = 'arrived' | 'passed';

// 距離の求め方。今は隣り合う駅どうしの直線距離の合計だけ。線路の長さに切り替えたとき
// (#7103)に、記録済みの行と見分けられるよう行ごとに持つ
export type RideDistanceSource = 'haversine';

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
    PRIMARY KEY (sessionId, seq)
  );`
  );
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

const insertStop = (sessionId: string, stop: RideStopRecord) =>
  getDb().runAsync(
    `INSERT INTO ride_stops (sessionId, seq, stationId, stationGroupId, stationName, lineId, lineName, lineColor, kind, arrivedAt, departedAt, distanceFromPrevious, distanceSource)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
 */
export const deleteAllRideLogs = async (): Promise<void> => {
  await ensureRideLogDbInitialized();
  const db = getDb();
  await db.execAsync('DELETE FROM ride_sessions;');
};
