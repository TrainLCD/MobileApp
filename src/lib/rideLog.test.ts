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
      ],
    ]);
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
    mockDb.getAllAsync.mockResolvedValueOnce([session]).mockResolvedValueOnce([
      row(0, 'arrived'),
      row(1, 'passed'),
      // このバージョンが知らない値の行は読み飛ばす
      row(2, 'unknown'),
      row(3, 'arrived'),
    ]);

    const result = await getRideSessionsStartedBetween(0, 10_000);

    expect(mockDb.getAllAsync.mock.calls[0][1]).toEqual([0, 10_000]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('s1');
    expect(result[0].stops.map((s) => [s.seq, s.kind])).toEqual([
      [0, 'arrived'],
      [1, 'passed'],
      [3, 'arrived'],
    ]);
    expect(result[0].stops[0]).not.toHaveProperty('sessionId');
  });

  it('期間に乗車が無ければ駅は読みに行かない', async () => {
    mockDb.getAllAsync.mockResolvedValueOnce([]);
    const result = await getRideSessionsStartedBetween(0, 10_000);
    expect(result).toEqual([]);
    expect(mockDb.getAllAsync).toHaveBeenCalledTimes(1);
  });
});
