import { act, renderHook } from '@testing-library/react-native';
import * as Location from 'expo-location';
import {
  LOCATION_HEARTBEAT_MAX_PENDING,
  LOCATION_HEARTBEAT_STALE_THRESHOLD,
} from '../constants/location';
import {
  getLastTrackedLocationAtMs,
  handleTrackingLocation,
} from '../utils/handleTrackingLocation';
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

jest.mock('../utils/handleTrackingLocation', () => ({
  handleTrackingLocation: jest.fn(),
  getLastTrackedLocationAtMs: jest.fn(() => 0),
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

const mockGetCurrentPositionAsync =
  Location.getCurrentPositionAsync as jest.Mock;
const mockGetForegroundPermissionsAsync =
  Location.getForegroundPermissionsAsync as jest.Mock;
const mockHandleTrackingLocation = handleTrackingLocation as jest.Mock;
const mockGetLastTrackedLocationAtMs = getLastTrackedLocationAtMs as jest.Mock;

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
    // 既定は「配信が途絶えている」状態。点検のたびに現在時刻から遡って返すことで、
    // 何秒進めても途絶えたままの環境を表す。
    mockGetLastTrackedLocationAtMs.mockImplementation(
      () => Date.now() - LOCATION_HEARTBEAT_STALE_THRESHOLD
    );
    mockGetCurrentPositionAsync.mockResolvedValue(makeLocation(NOW));
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('配信が途絶えている間は継続測位と同じ入口へ測位を流し込む', async () => {
    await startHeartbeat();

    await advanceToNextCheck();

    expect(mockGetCurrentPositionAsync).toHaveBeenCalledTimes(1);
    // 重複排除・精度フィルタ・EMAを継続測位と共有するため、必ずこの入口を通す
    expect(mockHandleTrackingLocation).toHaveBeenCalledWith(makeLocation(NOW));
  });

  it('直近に配信が届いている間は取得しない', async () => {
    // 点検の直前まで配信が届き続けている環境
    mockGetLastTrackedLocationAtMs.mockImplementation(
      () => Date.now() - LOCATION_HEARTBEAT_STALE_THRESHOLD + 1
    );
    await startHeartbeat();

    await advanceToNextCheck();
    await advanceToNextCheck();

    expect(mockGetCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('一度も配信が無い状態(起動直後に地下)でも取得する', async () => {
    mockGetLastTrackedLocationAtMs.mockReturnValue(0);
    await startHeartbeat();

    await advanceToNextCheck();

    expect(mockGetCurrentPositionAsync).toHaveBeenCalledTimes(1);
  });

  it('一度も配信が無い間は、まず継続測位に譲って途絶時間ぶん待つ', async () => {
    // 起動直後は継続測位が数秒で最初の測位を届ける。ここで待たないと、起動のたびに
    // 継続測位と一発取得が必ず二重に走る。
    mockGetLastTrackedLocationAtMs.mockReturnValue(0);
    await startHeartbeat();

    await advanceBy(LOCATION_HEARTBEAT_STALE_THRESHOLD - 1);
    expect(mockGetCurrentPositionAsync).not.toHaveBeenCalled();

    await advanceBy(1);
    expect(mockGetCurrentPositionAsync).toHaveBeenCalledTimes(1);
  });

  it('既に途絶している状態で開始したら待たずに取得する', async () => {
    // 地下でアプリを前景へ戻した場合。effectの張り直しで固定時間待つと、
    // 復帰から取得までさらに途絶時間ぶん遅れる。
    mockGetLastTrackedLocationAtMs.mockReturnValue(
      NOW - LOCATION_HEARTBEAT_STALE_THRESHOLD
    );
    await startHeartbeat();

    await advanceBy(1);

    expect(mockGetCurrentPositionAsync).toHaveBeenCalledTimes(1);
  });

  it('端末の時計が巻き戻っても点検が先送りされない', async () => {
    // 経過時間が負になる。残り時間として使うと巻き戻し幅ぶん点検が飛び、
    // 補完測位が止まる(handleTrackingLocationの巻き戻しガードと同じ理由)。
    mockGetLastTrackedLocationAtMs.mockImplementation(
      () => Date.now() + 60_000
    );
    await startHeartbeat();

    await advanceBy(1);

    expect(mockGetCurrentPositionAsync).toHaveBeenCalledTimes(1);
  });

  it('変位ゲートを持たないプラットフォームでは動かない', async () => {
    mockNeedsLocationHeartbeat = false;
    await startHeartbeat();

    await advanceToNextCheck();

    expect(mockGetCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('オートモード中はシミュレーターの現在地を汚さないよう動かない', async () => {
    mockAutoModeEnabled = true;
    await startHeartbeat();

    await advanceToNextCheck();

    expect(mockGetCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('背景では動かない', async () => {
    // 背景では測位が deferredUpdatesInterval ぶん貯めてから報告されるため、正常時も
    // 配信間隔が途絶時間以上になり途絶と区別できない。一発取得も背景では成立しない。
    mockIsAppActive = false;
    await startHeartbeat();

    await advanceToNextCheck();

    expect(mockGetCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('前景の位置情報権限が無ければ動かない', async () => {
    // 「許可せずに開始」した利用者では取得が毎回失敗するだけになる
    mockGetForegroundPermissionsAsync.mockResolvedValue({ granted: false });
    await startHeartbeat();

    await advanceToNextCheck();
    await advanceToNextCheck();

    expect(mockGetCurrentPositionAsync).not.toHaveBeenCalled();
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

    expect(mockGetCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('取得が返るまでは次の点検で重ねて要求しない', async () => {
    let resolveFirst: ((location: Location.LocationObject) => void) | null =
      null;
    mockGetCurrentPositionAsync.mockImplementationOnce(
      () =>
        new Promise<Location.LocationObject>((resolve) => {
          resolveFirst = resolve;
        })
    );
    await startHeartbeat();

    await advanceToNextCheck();
    await advanceToNextCheck();

    expect(mockGetCurrentPositionAsync).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFirst?.(makeLocation(Date.now()));
    });
    await advanceToNextCheck();

    expect(mockGetCurrentPositionAsync).toHaveBeenCalledTimes(2);
  });

  it('応答が返らない取得に引きずられて補完測位ごと止まらない', async () => {
    // iOSのgetCurrentPositionAsyncにはタイムアウトが無く、測位が得られない地下では
    // 応答が返らないことがある。見切らないとガードが解けず二度と取得しなくなる。
    mockGetCurrentPositionAsync.mockImplementation(
      () => new Promise<Location.LocationObject>(() => {})
    );
    await startHeartbeat();

    await advanceBy(1);
    expect(mockGetCurrentPositionAsync).toHaveBeenCalledTimes(1);

    // 見切り時間に達するまでは重ねて要求しない(1件目の要求時刻は進める前の時点)
    await advanceBy(LOCATION_HEARTBEAT_MAX_PENDING - 2);
    expect(mockGetCurrentPositionAsync).toHaveBeenCalledTimes(1);

    await advanceBy(1);
    expect(mockGetCurrentPositionAsync).toHaveBeenCalledTimes(2);
  });

  it('見切った取得が後から返ってきても新しい取得のガードを解かず、測位自体は取り込む', async () => {
    let resolveFirst: ((location: Location.LocationObject) => void) | null =
      null;
    mockGetCurrentPositionAsync.mockImplementationOnce(
      () =>
        new Promise<Location.LocationObject>((resolve) => {
          resolveFirst = resolve;
        })
    );
    mockGetCurrentPositionAsync.mockImplementationOnce(
      () => new Promise<Location.LocationObject>(() => {})
    );
    await startHeartbeat();

    await advanceBy(1);
    // 1件目を見切って2件目を出させる
    await advanceBy(LOCATION_HEARTBEAT_MAX_PENDING);
    expect(mockGetCurrentPositionAsync).toHaveBeenCalledTimes(2);

    // 1件目(見切り済み)が返っても、2件目は取得中のままなので次の点検では要求しない
    const lateLocation = makeLocation(Date.now());
    await act(async () => {
      resolveFirst?.(lateLocation);
    });
    await advanceToNextCheck();

    expect(mockGetCurrentPositionAsync).toHaveBeenCalledTimes(2);
    // 遅れて届いた測位も捨てず、継続測位と同じ入口へ通す(古ければ重複排除が落とす)
    expect(mockHandleTrackingLocation).toHaveBeenCalledWith(lateLocation);
  });

  it('継続測位と同じ精度で取得する', async () => {
    await startHeartbeat();

    await advanceToNextCheck();

    expect(mockGetCurrentPositionAsync).toHaveBeenLastCalledWith({
      accuracy: Location.Accuracy.High,
    });
  });

  it('アンマウント後は取得も反映も行わない', async () => {
    let resolveFirst: ((location: Location.LocationObject) => void) | null =
      null;
    mockGetCurrentPositionAsync.mockImplementationOnce(
      () =>
        new Promise<Location.LocationObject>((resolve) => {
          resolveFirst = resolve;
        })
    );
    const { unmount } = await startHeartbeat();

    await advanceToNextCheck();
    unmount();
    await act(async () => {
      resolveFirst?.(makeLocation(Date.now()));
    });
    await advanceToNextCheck();

    expect(mockGetCurrentPositionAsync).toHaveBeenCalledTimes(1);
    expect(mockHandleTrackingLocation).not.toHaveBeenCalled();
  });

  it('取得に失敗し続けても警告は連続の先頭だけに絞る', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockGetCurrentPositionAsync.mockRejectedValue(
      new Error('位置情報を取得できません')
    );
    await startHeartbeat();

    await advanceToNextCheck();
    await advanceToNextCheck();

    expect(mockGetCurrentPositionAsync).toHaveBeenCalledTimes(2);
    expect(warnSpy).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
  });
});
