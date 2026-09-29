// openDatabaseSync はモジュール読み込み時に呼ばれるため、DB のモックは
// jest.mock のファクトリ内で作り、requireMock で取り出す
jest.mock('expo-sqlite', () => {
  const db = {
    execAsync: jest.fn(() => Promise.resolve()),
    runAsync: jest.fn(() => Promise.resolve()),
    getAllAsync: jest.fn(() => Promise.resolve([])),
    withTransactionAsync: jest.fn((task: () => Promise<void>) => task()),
  };
  return { openDatabaseSync: jest.fn(() => db), __mockDb: db };
});

import {
  appendRideStop,
  deleteAllRideLogs,
  enqueueRideLogMutation,
  getRideSessionsStartedBetween,
  insertRideSession,
  type RideStopRecord,
  updateRideStopDeparture,
} from './rideLog';

const mockDb = jest.requireMock('expo-sqlite').__mockDb as {
  execAsync: jest.Mock;
  runAsync: jest.Mock;
  getAllAsync: jest.Mock;
  withTransactionAsync: jest.Mock;
};

// 初期化の列の確認(PRAGMA table_info)と、乗車・駅の読み出しを SQL で振り分ける。
// 初期化はモジュールで1度だけなので、どのテストで走っても読み出しの結果を取り違えない
const mockReads = (sessions: unknown[], stops: unknown[]) => {
  mockDb.getAllAsync.mockImplementation((sql: string) => {
    if (sql.startsWith('PRAGMA')) {
      return Promise.resolve([]);
    }
    return Promise.resolve(
      sql.includes('FROM ride_sessions') ? sessions : stops
    );
  });
};

const stop = (seq: number, overrides: Partial<RideStopRecord> = {}) => ({
  seq,
  stationId: 100 + seq,
  stationGroupId: 200 + seq,
  stationName: `駅${seq}`,
  lineId: 11,
  lineName: '中央線快速',
  lineColor: '#F15A22',
  kind: 'arrived' as const,
  arrivedAt: 1_000 * seq,
  departedAt: null,
  distanceFromPrevious: 500,
  distanceSource: 'haversine' as const,
  latitude: null,
  longitude: null,
  pathFromPrevious: null,
  ...overrides,
});

describe('rideLog', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('最初の書き込みの前にテーブルを作り、外部キー制約を有効にする', async () => {
    await insertRideSession(
      {
        id: 's1',
        startedAt: 0,
        endedAt: 1_000,
        lineId: 11,
        lineName: '中央線快速',
        lineColor: '#F15A22',
        trainTypeId: null,
        direction: 'INBOUND',
      },
      [stop(0, { arrivedAt: null }), stop(1)]
    );
    const sqls = (mockDb.execAsync.mock.calls as unknown as string[][]).map(
      ([sql]) => sql
    );
    expect(sqls[0]).toBe('PRAGMA foreign_keys = ON;');
    expect(
      sqls.some((q) => q.includes('CREATE TABLE IF NOT EXISTS ride_sessions'))
    ).toBe(true);
    expect(
      sqls.some((q) => q.includes('CREATE TABLE IF NOT EXISTS ride_stops'))
    ).toBe(true);
    // 座標の列が無い古いテーブル(table_info が列を返さない)には列を足す
    expect(sqls).toEqual(
      expect.arrayContaining([
        'ALTER TABLE ride_stops ADD COLUMN latitude REAL;',
        'ALTER TABLE ride_stops ADD COLUMN longitude REAL;',
        'ALTER TABLE ride_stops ADD COLUMN pathFromPrevious TEXT;',
      ])
    );

    // セッション1行と駅2行を1トランザクションで書く
    expect(mockDb.withTransactionAsync).toHaveBeenCalledTimes(1);
    expect(mockDb.runAsync).toHaveBeenCalledTimes(3);
    expect(mockDb.runAsync.mock.calls[0]).toEqual([
      expect.stringContaining('INSERT INTO ride_sessions'),
      ['s1', 0, 1_000, 11, '中央線快速', '#F15A22', null, 'INBOUND'],
    ]);
    expect(mockDb.runAsync.mock.calls[1]).toEqual([
      expect.stringContaining('INSERT INTO ride_stops'),
      [
        's1',
        0,
        100,
        200,
        '駅0',
        11,
        '中央線快速',
        '#F15A22',
        'arrived',
        null,
        null,
        500,
        'haversine',
        null,
        null,
        null,
      ],
    ]);
  });

  it('駅の座標と、あいだに通った駅の座標を書く', async () => {
    await appendRideStop(
      's1',
      stop(2, {
        latitude: 35.6812,
        longitude: 139.7671,
        pathFromPrevious: [
          { latitude: 35.6918, longitude: 139.7709 },
          { latitude: 35.6995, longitude: 139.765 },
        ],
      })
    );
    const [, params] = mockDb.runAsync.mock.calls[0] as [string, unknown[]];
    expect(params.slice(-3)).toEqual([
      35.6812,
      139.7671,
      '[[35.6918,139.7709],[35.6995,139.765]]',
    ]);
  });

  it('座標の列がすでにあるテーブルには列を足さない', async () => {
    await jest.isolateModulesAsync(async () => {
      const db = jest.requireMock('expo-sqlite').__mockDb as typeof mockDb;
      db.getAllAsync.mockImplementation((sql: string) =>
        Promise.resolve(
          sql.startsWith('PRAGMA')
            ? [
                { name: 'latitude' },
                { name: 'longitude' },
                { name: 'pathFromPrevious' },
              ]
            : []
        )
      );
      const { ensureRideLogDbInitialized } = require('./rideLog');
      await ensureRideLogDbInitialized();
      const sqls = (db.execAsync.mock.calls as unknown as string[][]).map(
        ([sql]) => sql
      );
      expect(sqls.some((q) => q.startsWith('ALTER TABLE'))).toBe(false);
    });
  });

  it('到着した駅を足すと終了時刻も進める', async () => {
    await appendRideStop('s1', stop(2));
    expect(mockDb.runAsync).toHaveBeenCalledTimes(2);
    expect(mockDb.runAsync.mock.calls[1]).toEqual([
      'UPDATE ride_sessions SET endedAt = ? WHERE id = ?',
      [2_000, 's1'],
    ]);
  });

  it('通過駅を足しても終了時刻は進めない', async () => {
    await appendRideStop('s1', stop(2, { kind: 'passed' }));
    expect(mockDb.runAsync).toHaveBeenCalledTimes(1);
  });

  it('発車時刻を書き足す', async () => {
    await updateRideStopDeparture('s1', 2, 3_000);
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      'UPDATE ride_stops SET departedAt = ? WHERE sessionId = ? AND seq = ?',
      [3_000, 's1', 2]
    );
  });

  it('全件削除はセッションを消し、駅の行は外部キーで一緒に消す', async () => {
    await deleteAllRideLogs();
    expect(mockDb.execAsync).toHaveBeenLastCalledWith(
      'DELETE FROM ride_sessions;'
    );
  });

  it('全件削除は、先に積まれた書き込みが終わってから実行する', async () => {
    let finishWrite: () => void = () => {};
    const pendingWrite = enqueueRideLogMutation(
      () =>
        new Promise<void>((resolve) => {
          finishWrite = resolve;
        })
    );
    const deletion = deleteAllRideLogs();
    await Promise.resolve();
    await Promise.resolve();
    expect(mockDb.execAsync).not.toHaveBeenCalledWith(
      'DELETE FROM ride_sessions;'
    );

    finishWrite();
    await pendingWrite;
    await deletion;
    expect(mockDb.execAsync).toHaveBeenLastCalledWith(
      'DELETE FROM ride_sessions;'
    );
  });

  it('先に積まれた書き込みが失敗しても、全件削除は実行する', async () => {
    const failed = enqueueRideLogMutation(() =>
      Promise.reject(new Error('db'))
    );
    await expect(failed).rejects.toThrow('db');
    await deleteAllRideLogs();
    expect(mockDb.execAsync).toHaveBeenLastCalledWith(
      'DELETE FROM ride_sessions;'
    );
  });

  it('期間に乗りはじめた乗車を、駅の並び付きで読み出す', async () => {
    const session = {
      id: 's1',
      startedAt: 1_000,
      endedAt: 5_000,
      lineId: 11,
      lineName: '中央線快速',
      lineColor: '#F15A22',
      trainTypeId: null,
      direction: 'INBOUND',
    };
    const row = (seq: number, kind: string) => ({
      sessionId: 's1',
      ...stop(seq),
      kind,
    });
    mockReads(
      [session],
      [
        row(0, 'arrived'),
        row(1, 'passed'),
        // このバージョンが知らない値の行は読み飛ばす
        row(2, 'unknown'),
        row(3, 'arrived'),
      ]
    );

    const result = await getRideSessionsStartedBetween(0, 10_000);

    const sessionQuery = mockDb.getAllAsync.mock.calls.find(([sql]) =>
      (sql as string).includes('FROM ride_sessions WHERE')
    );
    expect(sessionQuery?.[1]).toEqual([0, 10_000]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('s1');
    expect(result[0].stops.map((s) => [s.seq, s.kind])).toEqual([
      [0, 'arrived'],
      [1, 'passed'],
      [3, 'arrived'],
    ]);
    expect(result[0].stops[0]).not.toHaveProperty('sessionId');
  });

  it('経路の座標を読み戻し、壊れた値は経路が無いものとして扱う', async () => {
    mockReads(
      [
        {
          id: 's1',
          startedAt: 1_000,
          endedAt: 5_000,
          lineId: 11,
          lineName: null,
          lineColor: null,
          trainTypeId: null,
          direction: null,
        },
      ],
      [
        {
          sessionId: 's1',
          ...stop(0),
          latitude: 35.6812,
          longitude: 139.7671,
          pathFromPrevious: '[]',
        },
        {
          sessionId: 's1',
          ...stop(1),
          latitude: 35.6995,
          longitude: 139.765,
          pathFromPrevious: '[[35.6918,139.7709]]',
        },
        { sessionId: 's1', ...stop(2), pathFromPrevious: 'not json' },
        { sessionId: 's1', ...stop(3), pathFromPrevious: '[["a", 1]]' },
      ]
    );

    const [session] = await getRideSessionsStartedBetween(0, 10_000);

    expect(session.stops.map((s) => s.pathFromPrevious)).toEqual([
      [],
      [{ latitude: 35.6918, longitude: 139.7709 }],
      null,
      null,
    ]);
    expect(session.stops[1]).toMatchObject({
      latitude: 35.6995,
      longitude: 139.765,
    });
  });

  it('期間に乗車が無ければ駅は読みに行かない', async () => {
    mockReads([], []);
    const result = await getRideSessionsStartedBetween(0, 10_000);
    expect(result).toEqual([]);
    expect(
      mockDb.getAllAsync.mock.calls.filter(([sql]) =>
        (sql as string).includes('FROM ride_stops')
      )
    ).toHaveLength(0);
  });
});
