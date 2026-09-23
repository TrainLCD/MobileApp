import {
  countLocationHeartbeatAbandoned,
  countLocationHeartbeatDiscarded,
  countLocationHeartbeatFailed,
  countLocationHeartbeatRequested,
  countLocationHeartbeatSucceeded,
  countLocationHeartbeatTornDown,
  getLocationHeartbeatStats,
  recordLocationHeartbeatTeardownReason,
  resetLocationHeartbeatStats,
  setLocationHeartbeatState,
} from './locationHeartbeatStats';

beforeEach(() => {
  resetLocationHeartbeatStats();
});

describe('locationHeartbeatStats', () => {
  it('初期状態は未マウントで、どの数も0', () => {
    expect(getLocationHeartbeatStats()).toEqual({
      state: 'not-mounted',
      requested: 0,
      succeeded: 0,
      failed: 0,
      abandoned: 0,
      discarded: 0,
      teardowns: 0,
      recentTeardownReasons: [],
      lastErrorMessage: null,
    });
  });

  it('要求・成功・失敗・見切りをそれぞれ数える', () => {
    countLocationHeartbeatRequested();
    countLocationHeartbeatRequested();
    countLocationHeartbeatSucceeded();
    countLocationHeartbeatFailed(new Error('位置情報が取得できません'));
    countLocationHeartbeatAbandoned();

    const stats = getLocationHeartbeatStats();
    expect(stats.requested).toBe(2);
    expect(stats.succeeded).toBe(1);
    expect(stats.failed).toBe(1);
    expect(stats.abandoned).toBe(1);
  });

  it('捨てた要求と片付けの回数をそれぞれ数える', () => {
    countLocationHeartbeatDiscarded();
    countLocationHeartbeatTornDown();
    countLocationHeartbeatTornDown();

    const stats = getLocationHeartbeatStats();
    expect(stats.discarded).toBe(1);
    expect(stats.teardowns).toBe(2);
  });

  it('張り直しの理由を新しいものが末尾になる順で残す', () => {
    recordLocationHeartbeatTeardownReason('foreground: true→false');
    recordLocationHeartbeatTeardownReason('foreground: false→true');

    expect(getLocationHeartbeatStats().recentTeardownReasons).toEqual([
      'foreground: true→false',
      'foreground: false→true',
    ]);
  });

  it('張り直しの理由は直近5件だけ残す', () => {
    // 乗車1回ぶんを追うには数件あれば足りる。無制限に積むとダンプが埋まる
    for (let i = 1; i <= 7; i += 1) {
      recordLocationHeartbeatTeardownReason(`理由${i}`);
    }

    expect(getLocationHeartbeatStats().recentTeardownReasons).toEqual([
      '理由3',
      '理由4',
      '理由5',
      '理由6',
      '理由7',
    ]);
  });

  it('持ち出した理由の配列は後から書き換わらない', () => {
    // ダンプは持ち出した時点の値でなければ、2枚の差分で区間を読めない
    recordLocationHeartbeatTeardownReason('1件目');
    const taken = getLocationHeartbeatStats().recentTeardownReasons;

    recordLocationHeartbeatTeardownReason('2件目');

    expect(taken).toEqual(['1件目']);
  });

  it('直近の失敗理由を残す', () => {
    countLocationHeartbeatFailed(new Error('最初の失敗'));
    countLocationHeartbeatFailed(new Error('最後の失敗'));

    expect(getLocationHeartbeatStats().lastErrorMessage).toBe('最後の失敗');
  });

  it('Error以外が投げられても文字列として残す', () => {
    countLocationHeartbeatFailed('文字列のエラー');
    expect(getLocationHeartbeatStats().lastErrorMessage).toBe('文字列のエラー');

    countLocationHeartbeatFailed({ code: 1 });
    expect(getLocationHeartbeatStats().lastErrorMessage).toBe(
      '[object Object]'
    );
  });

  // 診断はクリップボードへ丸ごと貼るものなので、1件の失敗でダンプが埋まらないようにする
  it('長すぎる失敗理由は切り詰める', () => {
    countLocationHeartbeatFailed(new Error('あ'.repeat(500)));

    expect(getLocationHeartbeatStats().lastErrorMessage).toHaveLength(200);
  });

  it('稼働状態を記録する', () => {
    setLocationHeartbeatState('running');
    expect(getLocationHeartbeatStats().state).toBe('running');

    setLocationHeartbeatState('power-saving');
    expect(getLocationHeartbeatStats().state).toBe('power-saving');
  });

  // 呼び出し側が受け取った値を書き換えても集計は壊れない
  it('取得した値は複製で、内部状態と共有しない', () => {
    countLocationHeartbeatRequested();
    const snapshot = getLocationHeartbeatStats();
    snapshot.requested = 999;

    expect(getLocationHeartbeatStats().requested).toBe(1);
  });

  it('リセットで初期値へ戻る', () => {
    setLocationHeartbeatState('running');
    countLocationHeartbeatRequested();
    countLocationHeartbeatFailed(new Error('失敗'));

    resetLocationHeartbeatStats();

    expect(getLocationHeartbeatStats()).toEqual({
      state: 'not-mounted',
      requested: 0,
      succeeded: 0,
      failed: 0,
      abandoned: 0,
      discarded: 0,
      teardowns: 0,
      recentTeardownReasons: [],
      lastErrorMessage: null,
    });
  });
});
