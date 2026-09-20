import { act, renderHook } from '@testing-library/react-native';
import * as Location from 'expo-location';
import {
  LOCATION_HEARTBEAT_MAX_PENDING,
  LOCATION_HEARTBEAT_STALE_THRESHOLD,
} from '../constants/location';
import {
  getMsSinceLastTrackedLocation,
  handleTrackingLocation,
} from '../utils/handleTrackingLocation';
import {
  getLocationHeartbeatStats,
  resetLocationHeartbeatStats,
} from '../utils/locationHeartbeatStats';
import { monotonicNow } from '../utils/monotonicNow';
import { useLocationHeartbeat } from './useLocationHeartbeat';

let mockNeedsLocationHeartbeat = true;
// スプレッドで組み立てた mock へ後から getter を足す。オブジェクトリテラル内に
// getter を書くとスプレッドの Object.assign が展開時に一度だけ評価してしまい、
// テストごとの差し替えが効かなくなる。
jest.mock('../constants/location', () => {
  const mocked = { ...jest.requireActual('../constants/location') };
  Object.defineProperty(mocked, 'NEEDS_LOCATION_HEARTBEAT', {
    get: () => mockNeedsLocationHeartbeat,
  });
  return mocked;
});

jest.mock('expo-location');

let mockSystemLowPowerMode = false;
jest.mock('expo-battery', () => ({
  useLowPowerMode: () => mockSystemLowPowerMode,
}));

let mockIsAppActive = true;
jest.mock('./useIsAppActive', () => ({
  useIsAppActive: () => mockIsAppActive,
}));

jest.mock('../utils/monotonicNow', () => ({
  monotonicNow: jest.fn(() => Date.now()),
}));

jest.mock('../utils/handleTrackingLocation', () => ({
  handleTrackingLocation: jest.fn(),
  getMsSinceLastTrackedLocation: jest.fn(() => null),
}));

jest.mock('~/store/atoms/navigation', () => ({
  __esModule: true,
  default: {},
  autoModeEnabledAtom: { toString: () => 'autoModeEnabledAtom' },
}));
jest.mock('~/store/atoms/battery', () => ({
  powerSavingLocationEnabledAtom: {
    toString: () => 'powerSavingLocationEnabledAtom',
  },
}));

let mockAutoModeEnabled = false;
let mockPowerSavingLocationEnabled = false;
jest.mock('jotai', () => ({
  ...jest.requireActual('jotai'),
  useAtomValue: jest.fn((atom: unknown) => {
    if (String(atom) === 'autoModeEnabledAtom') {
      return mockAutoModeEnabled;
    }
    if (String(atom) === 'powerSavingLocationEnabledAtom') {
      return mockPowerSavingLocationEnabled;
    }
    return undefined;
  }),
}));

const mockWatchPositionAsync = Location.watchPositionAsync as jest.Mock;
const mockGetForegroundPermissionsAsync =
  Location.getForegroundPermissionsAsync as jest.Mock;
const mockHandleTrackingLocation = handleTrackingLocation as jest.Mock;
const mockGetMsSinceLastTrackedLocation =
  getMsSinceLastTrackedLocation as jest.Mock;
const mockMonotonicNow = monotonicNow as jest.Mock;

const NOW = 1_700_000_000_000;

const makeLocation = (timestamp: number): Location.LocationObject => ({
  coords: {
    latitude: 35.681236,
    longitude: 139.767125,
    accuracy: 30,
    altitude: 0,
    altitudeAccuracy: 0,
    heading: 0,
    speed: 0,
  },
  timestamp,
});

/**
 * watchPositionAsync の呼び出しを掴むハーネス。
 *
 * 補完測位は一発取得ではなく「1件で閉じる購読」なので、測位はコールバックで届き、
 * 購読は明示的に閉じる必要がある。届いたかどうかだけでなく閉じたかどうかも検証したいので、
 * コールバックと remove の両方を記録する。
 */
type Watch = {
  emit: (location: Location.LocationObject) => void;
  remove: jest.Mock;
};

let watches: Watch[] = [];

/**
 * 購読の挙動を決める。`emitAt` を渡すとその時刻の測位を1件流し(=取得が成功する環境)、
 * null なら何も流さない(=測位が得られない地下)。実際の順序に合わせ、購読が確立してから流す。
 */
const setWatchBehavior = (
  emitAt: ((timestamp: number) => Location.LocationObject) | null
) => {
  mockWatchPositionAsync.mockImplementation(
    (
      _options: Location.LocationOptions,
      callback: (location: Location.LocationObject) => void
    ) => {
      const remove = jest.fn();
      watches.push({ emit: callback, remove });
      if (emitAt) {
        Promise.resolve().then(() => callback(emitAt(Date.now())));
      }
      return Promise.resolve({ remove });
    }
  );
};

// 権限確認(非同期)を消化してからでないと点検タイマーが張られない
const startHeartbeat = async () => {
  const rendered = renderHook(() => useLocationHeartbeat());
  await act(async () => {});
  return rendered;
};

// 「途絶が成立する次の時刻」まで進める。点検は固定間隔ではないので、
// 途絶時間ぶん進めれば必ず1回は点検が走る。
const advanceToNextCheck = async () => {
  await act(async () => {
    jest.advanceTimersByTime(LOCATION_HEARTBEAT_STALE_THRESHOLD);
  });
};

const advanceBy = async (ms: number) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
};

describe('useLocationHeartbeat', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    mockNeedsLocationHeartbeat = true;
    mockAutoModeEnabled = false;
    mockPowerSavingLocationEnabled = false;
    mockSystemLowPowerMode = false;
    mockIsAppActive = true;
    mockGetForegroundPermissionsAsync.mockResolvedValue({ granted: true });
    // 既定は「配信が途絶えている」状態
    mockGetMsSinceLastTrackedLocation.mockReturnValue(
      LOCATION_HEARTBEAT_STALE_THRESHOLD
    );
    watches = [];
    setWatchBehavior(() => makeLocation(NOW));
    mockMonotonicNow.mockImplementation(() => Date.now());
    resetLocationHeartbeatStats();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('配信が途絶えている間は継続測位と同じ入口へ測位を流し込む', async () => {
    await startHeartbeat();

    await advanceToNextCheck();

    expect(mockWatchPositionAsync).toHaveBeenCalledTimes(1);
    // 重複排除・精度フィルタ・EMAを継続測位と共有するため、必ずこの入口を通す
    expect(mockHandleTrackingLocation).toHaveBeenCalledWith(makeLocation(NOW));
  });

  it('直近に配信が届いている間は取得しない', async () => {
    // 点検の直前まで配信が届き続けている環境
    mockGetMsSinceLastTrackedLocation.mockReturnValue(
      LOCATION_HEARTBEAT_STALE_THRESHOLD - 1
    );
    await startHeartbeat();

    await advanceToNextCheck();
    await advanceToNextCheck();

    expect(mockWatchPositionAsync).not.toHaveBeenCalled();
  });

  it('一度も配信が無い状態(起動直後に地下)でも取得する', async () => {
    mockGetMsSinceLastTrackedLocation.mockReturnValue(null);
    await startHeartbeat();

    await advanceToNextCheck();

    expect(mockWatchPositionAsync).toHaveBeenCalledTimes(1);
  });

  it('一度も配信が無い間は、まず継続測位に譲って途絶時間ぶん待つ', async () => {
    // 起動直後は継続測位が数秒で最初の測位を届ける。ここで待たないと、起動のたびに
    // 継続測位と一発取得が必ず二重に走る。
    mockGetMsSinceLastTrackedLocation.mockReturnValue(null);
    await startHeartbeat();

    await advanceBy(LOCATION_HEARTBEAT_STALE_THRESHOLD - 1);
    expect(mockWatchPositionAsync).not.toHaveBeenCalled();

    await advanceBy(1);
    expect(mockWatchPositionAsync).toHaveBeenCalledTimes(1);
  });

  it('既に途絶している状態で開始したら待たずに取得する', async () => {
    // 地下でアプリを前景へ戻した場合。effectの張り直しで固定時間待つと、
    // 復帰から取得までさらに途絶時間ぶん遅れる。
    mockGetMsSinceLastTrackedLocation.mockReturnValue(
      LOCATION_HEARTBEAT_STALE_THRESHOLD
    );
    await startHeartbeat();

    await advanceBy(1);

    expect(mockWatchPositionAsync).toHaveBeenCalledTimes(1);
  });

  it('経過時間が負になっても点検が先送りされない', async () => {
    // monotonicNowがDate.nowへフォールバックした環境では、時計の巻き戻しで経過時間が
    // 負になりうる。残り時間として使うと巻き戻し幅ぶん点検が飛び、補完測位が止まる
    // (handleTrackingLocationの巻き戻しガードと同じ理由)。
    mockGetMsSinceLastTrackedLocation.mockReturnValue(-60_000);
    await startHeartbeat();

    await advanceBy(1);

    expect(mockWatchPositionAsync).toHaveBeenCalledTimes(1);
  });

  it('変位ゲートを持たないプラットフォームでは動かない', async () => {
    mockNeedsLocationHeartbeat = false;
    await startHeartbeat();

    await advanceToNextCheck();

    expect(mockWatchPositionAsync).not.toHaveBeenCalled();
  });

  it('オートモード中はシミュレーターの現在地を汚さないよう動かない', async () => {
    mockAutoModeEnabled = true;
    await startHeartbeat();

    await advanceToNextCheck();

    expect(mockWatchPositionAsync).not.toHaveBeenCalled();
  });

  it('背景では動かない', async () => {
    // 背景では測位が deferredUpdatesInterval ぶん貯めてから報告されるため、正常時も
    // 配信間隔が途絶時間以上になり途絶と区別できない。一発取得も背景では成立しない。
    mockIsAppActive = false;
    await startHeartbeat();

    await advanceToNextCheck();

    expect(mockWatchPositionAsync).not.toHaveBeenCalled();
  });

  it('前景の位置情報権限が無ければ動かない', async () => {
    // 「許可せずに開始」した利用者では取得が毎回失敗するだけになる
    mockGetForegroundPermissionsAsync.mockResolvedValue({ granted: false });
    await startHeartbeat();

    await advanceToNextCheck();
    await advanceToNextCheck();

    expect(mockWatchPositionAsync).not.toHaveBeenCalled();
  });

  // 省電力プロファイルはiOSで停車中の測位休止(pausesUpdatesAutomatically, #6395)を
  // 許可している。補完測位を動かすとその休止を打ち消すため、電池優先の設定を尊重する。
  it.each([
    ['「バッテリー」設定の省電力測位', 'setting'],
    ['端末の省電力モード', 'system'],
  ] as const)('%s が有効な間は動かない', async (_label, kind) => {
    if (kind === 'setting') {
      mockPowerSavingLocationEnabled = true;
    } else {
      mockSystemLowPowerMode = true;
    }
    await startHeartbeat();

    await advanceToNextCheck();

    expect(mockWatchPositionAsync).not.toHaveBeenCalled();
  });

  it('取得が返るまでは次の点検で重ねて要求しない', async () => {
    setWatchBehavior(null);
    await startHeartbeat();

    await advanceToNextCheck();
    await advanceToNextCheck();

    expect(mockWatchPositionAsync).toHaveBeenCalledTimes(1);

    await act(async () => {
      watches[0].emit(makeLocation(Date.now()));
    });
    await advanceToNextCheck();

    expect(mockWatchPositionAsync).toHaveBeenCalledTimes(2);
  });

  it('測位が1件届いたら購読を閉じる', async () => {
    // 閉じ忘れると、途絶のたびに張った購読が積み上がったまま測位を回し続ける
    await startHeartbeat();

    await advanceToNextCheck();

    expect(watches).toHaveLength(1);
    expect(watches[0].remove).toHaveBeenCalled();
  });

  it('応答が返らない取得に引きずられて補完測位ごと止まらない', async () => {
    // 測位が得られない地下では購読が延々と待ち続ける。
    // 見切らないとガードが解けず二度と取得しなくなる。
    setWatchBehavior(null);
    await startHeartbeat();

    await advanceBy(1);
    expect(mockWatchPositionAsync).toHaveBeenCalledTimes(1);

    // 見切り時間に達するまでは重ねて要求しない(1件目の要求時刻は進める前の時点)
    await advanceBy(LOCATION_HEARTBEAT_MAX_PENDING - 2);
    expect(mockWatchPositionAsync).toHaveBeenCalledTimes(1);

    await advanceBy(1);
    expect(mockWatchPositionAsync).toHaveBeenCalledTimes(2);
  });

  it('時計が巻き戻っても、保留の長さは見切りタイマーだけが決める', async () => {
    // monotonicNowがDate.nowへフォールバックした環境で、取得の応答を待っている間に
    // 時計が巻き戻ったケース。経過時間の計算で保留を解くと、巻き戻り方しだいで
    // 「1件目の応答を待たずに2件目を出す」か「見切れないまま止まる」のどちらかになる。
    setWatchBehavior(null);
    await startHeartbeat();

    await advanceBy(1);
    expect(mockWatchPositionAsync).toHaveBeenCalledTimes(1);

    // 時計を巻き戻したまま維持する
    mockMonotonicNow.mockImplementation(() => Date.now() - 600_000);

    // 見切り時間まで: 重ねて要求しない
    await advanceBy(LOCATION_HEARTBEAT_MAX_PENDING - 2);
    expect(mockWatchPositionAsync).toHaveBeenCalledTimes(1);

    // 見切り時間に達したら: 応答が無い要求を見切って次を出す
    await advanceBy(1);
    expect(mockWatchPositionAsync).toHaveBeenCalledTimes(2);
  });

  it('見切った購読は閉じ、張り直した購読が次の測位を取り込む', async () => {
    // 一発取得のときは「見切った要求が後から返る」ことがあり、その測位も通していた。
    // 購読は見切りで閉じるので後からは届かないが、閉じた直後に次の購読を張るため、
    // 測位が出た瞬間はそちらが拾う。取りこぼしはこの張り直しで防ぐ。
    setWatchBehavior(null);
    await startHeartbeat();

    await advanceBy(1);
    // 1件目を見切って2件目を出させる
    await advanceBy(LOCATION_HEARTBEAT_MAX_PENDING);
    expect(mockWatchPositionAsync).toHaveBeenCalledTimes(2);
    // 見切った購読は閉じる。閉じないと、見切っただけで測位が回り続ける
    expect(watches[0].remove).toHaveBeenCalled();

    // 1件目(見切り済み)へ遅れて測位が来ても、閉じているので何も起こさない
    await act(async () => {
      watches[0].emit(makeLocation(Date.now()));
    });
    expect(mockHandleTrackingLocation).not.toHaveBeenCalled();
    expect(mockWatchPositionAsync).toHaveBeenCalledTimes(2);

    // 張り直した2件目が測位を拾う
    const location = makeLocation(Date.now());
    await act(async () => {
      watches[1].emit(location);
    });

    expect(mockHandleTrackingLocation).toHaveBeenCalledWith(location);
  });

  it('継続測位と同じ精度で取得する', async () => {
    await startHeartbeat();

    await advanceToNextCheck();

    // 変位ゲートは0で張る。ここへ来る時点で継続測位のゲート(10m)に届いていないので、
    // 同じゲートを張り直したら待っても届かない
    expect(mockWatchPositionAsync).toHaveBeenLastCalledWith(
      { accuracy: Location.Accuracy.High, distanceInterval: 0 },
      expect.any(Function)
    );
  });

  it('アンマウント後は取得も反映も行わない', async () => {
    setWatchBehavior(null);
    const { unmount } = await startHeartbeat();

    await advanceToNextCheck();
    unmount();
    await act(async () => {
      watches[0].emit(makeLocation(Date.now()));
    });
    await advanceToNextCheck();

    expect(mockWatchPositionAsync).toHaveBeenCalledTimes(1);
    expect(mockHandleTrackingLocation).not.toHaveBeenCalled();
  });

  it('アンマウントで購読を閉じる', async () => {
    // 購読はアンマウントで自然に閉じない。画面を離れたあとも測位が回り続ける
    setWatchBehavior(null);
    const { unmount } = await startHeartbeat();

    await advanceToNextCheck();
    expect(watches[0].remove).not.toHaveBeenCalled();

    unmount();

    expect(watches[0].remove).toHaveBeenCalled();
  });

  it('取得に失敗し続けても警告は連続の先頭だけに絞る', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockWatchPositionAsync.mockRejectedValue(
      new Error('位置情報を取得できません')
    );
    await startHeartbeat();

    await advanceToNextCheck();
    await advanceToNextCheck();

    expect(mockWatchPositionAsync).toHaveBeenCalledTimes(2);
    expect(warnSpy).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
  });

  /**
   * 診断(DevOverlayのダンプ)向けの記録。測位が一件も得られない区間では
   * locationPipelineStats のどのカウンタも動かないため、「要求を出していない」のか
   * 「出しても得られていない」のかはここで数えないと後から区別できない。
   */
  describe('診断の記録', () => {
    it('要求と成功を数える', async () => {
      await startHeartbeat();

      await advanceToNextCheck();

      expect(getLocationHeartbeatStats()).toMatchObject({
        state: 'running',
        requested: 1,
        succeeded: 1,
        failed: 0,
      });
    });

    it('失敗の件数と直近の理由を残す', async () => {
      // 警告は連続の先頭だけに絞られるので、2件目以降はログから追えない。
      // 地下で失敗が続いているのかどうかは、この件数でしか判断できない。
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      mockWatchPositionAsync.mockRejectedValue(
        new Error('位置情報を取得できません')
      );
      await startHeartbeat();

      await advanceToNextCheck();
      await advanceToNextCheck();

      expect(getLocationHeartbeatStats()).toMatchObject({
        requested: 2,
        succeeded: 0,
        failed: 2,
        lastErrorMessage: '位置情報を取得できません',
      });

      warnSpy.mockRestore();
    });

    it('応答が返らないまま見切った取得を数える', async () => {
      setWatchBehavior(null);
      await startHeartbeat();

      await advanceToNextCheck();
      await advanceBy(LOCATION_HEARTBEAT_MAX_PENDING);

      expect(getLocationHeartbeatStats()).toMatchObject({
        requested: 2,
        abandoned: 1,
      });
    });

    it.each([
      ['変位ゲートを持たないプラットフォーム', 'unnecessary'],
      ['オートモード', 'auto-mode'],
      ['背景', 'app-inactive'],
      ['省電力測位', 'power-saving'],
      ['権限なし', 'permission-denied'],
    ] as const)('%s では止めている理由を残す', async (label, expected) => {
      if (label === '変位ゲートを持たないプラットフォーム') {
        mockNeedsLocationHeartbeat = false;
      } else if (label === 'オートモード') {
        mockAutoModeEnabled = true;
      } else if (label === '背景') {
        mockIsAppActive = false;
      } else if (label === '省電力測位') {
        mockPowerSavingLocationEnabled = true;
      } else {
        mockGetForegroundPermissionsAsync.mockResolvedValue({
          granted: false,
        });
      }
      await startHeartbeat();

      await advanceToNextCheck();

      expect(getLocationHeartbeatStats().state).toBe(expected);
      expect(getLocationHeartbeatStats().requested).toBe(0);
    });

    it('権限の確認自体に失敗したときも止まった状態として残す', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      mockGetForegroundPermissionsAsync.mockRejectedValue(
        new Error('権限を確認できません')
      );
      await startHeartbeat();

      expect(getLocationHeartbeatStats().state).toBe('permission-denied');

      warnSpy.mockRestore();
    });

    // 画面を離れたあとも running のままだと、動いていない区間のダンプが動作中に見える
    it('アンマウントで未マウントへ戻る', async () => {
      const { unmount } = await startHeartbeat();
      expect(getLocationHeartbeatStats().state).toBe('running');

      unmount();

      expect(getLocationHeartbeatStats().state).toBe('not-mounted');
    });
  });
});
