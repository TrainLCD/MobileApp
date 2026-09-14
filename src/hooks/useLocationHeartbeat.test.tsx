import { act, renderHook } from '@testing-library/react-native';
import * as Location from 'expo-location';
import {
  LOCATION_HEARTBEAT_INTERVAL,
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

// タイマーのtickとその中で発行される取得のPromiseを両方消化する
const advanceOneTick = async () => {
  await act(async () => {
    jest.advanceTimersByTime(LOCATION_HEARTBEAT_INTERVAL);
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
    // 既定は「配信が途絶えている」状態。tickのたびに現在時刻から遡って返すことで、
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
    renderHook(() => useLocationHeartbeat());

    await advanceOneTick();

    expect(mockGetCurrentPositionAsync).toHaveBeenCalledTimes(1);
    // 重複排除・精度フィルタ・EMAを継続測位と共有するため、必ずこの入口を通す
    expect(mockHandleTrackingLocation).toHaveBeenCalledWith(makeLocation(NOW));
  });

  it('直近に配信が届いている間は取得しない', async () => {
    // tickの直前まで配信が届き続けている環境
    mockGetLastTrackedLocationAtMs.mockImplementation(
      () => Date.now() - LOCATION_HEARTBEAT_STALE_THRESHOLD + 1
    );
    renderHook(() => useLocationHeartbeat());

    await advanceOneTick();

    expect(mockGetCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('一度も配信が無い状態(起動直後に地下)でも取得する', async () => {
    mockGetLastTrackedLocationAtMs.mockReturnValue(0);
    renderHook(() => useLocationHeartbeat());

    await advanceOneTick();

    expect(mockGetCurrentPositionAsync).toHaveBeenCalledTimes(1);
  });

  it('変位ゲートを持たないプラットフォームでは動かない', async () => {
    mockNeedsLocationHeartbeat = false;
    renderHook(() => useLocationHeartbeat());

    await advanceOneTick();

    expect(mockGetCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('オートモード中はシミュレーターの現在地を汚さないよう動かない', async () => {
    mockAutoModeEnabled = true;
    renderHook(() => useLocationHeartbeat());

    await advanceOneTick();

    expect(mockGetCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('取得が返るまでは次のtickで重ねて要求しない', async () => {
    let resolveFirst: ((location: Location.LocationObject) => void) | null =
      null;
    mockGetCurrentPositionAsync.mockImplementationOnce(
      () =>
        new Promise<Location.LocationObject>((resolve) => {
          resolveFirst = resolve;
        })
    );
    renderHook(() => useLocationHeartbeat());

    await advanceOneTick();
    await advanceOneTick();

    expect(mockGetCurrentPositionAsync).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFirst?.(makeLocation(NOW));
    });
    await advanceOneTick();

    expect(mockGetCurrentPositionAsync).toHaveBeenCalledTimes(2);
  });

  it('応答が返らない取得に引きずられて補完測位ごと止まらない', async () => {
    // iOSのgetCurrentPositionAsyncにはタイムアウトが無く、測位が得られない地下では
    // 応答が返らないことがある。見切らないとガードが解けず二度と取得しなくなる。
    mockGetCurrentPositionAsync.mockImplementation(
      () => new Promise<Location.LocationObject>(() => {})
    );
    renderHook(() => useLocationHeartbeat());

    await advanceOneTick();
    expect(mockGetCurrentPositionAsync).toHaveBeenCalledTimes(1);

    // 見切り時間に達するまでは重ねて要求しない
    const ticksUntilGiveUp = Math.ceil(
      LOCATION_HEARTBEAT_MAX_PENDING / LOCATION_HEARTBEAT_INTERVAL
    );
    for (let i = 1; i < ticksUntilGiveUp; i++) {
      await advanceOneTick();
    }
    expect(mockGetCurrentPositionAsync).toHaveBeenCalledTimes(1);

    await advanceOneTick();
    expect(mockGetCurrentPositionAsync).toHaveBeenCalledTimes(2);
  });

  it('見切った取得が後から返ってきても新しい取得のガードを解かない', async () => {
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
    renderHook(() => useLocationHeartbeat());

    const ticksUntilGiveUp = Math.ceil(
      LOCATION_HEARTBEAT_MAX_PENDING / LOCATION_HEARTBEAT_INTERVAL
    );
    for (let i = 0; i < ticksUntilGiveUp + 1; i++) {
      await advanceOneTick();
    }
    expect(mockGetCurrentPositionAsync).toHaveBeenCalledTimes(2);

    // 1件目(見切り済み)が返っても、2件目は取得中のままなので次のtickは要求しない
    await act(async () => {
      resolveFirst?.(makeLocation(Date.now()));
    });
    await advanceOneTick();

    expect(mockGetCurrentPositionAsync).toHaveBeenCalledTimes(2);
  });

  it('継続測位と同じ精度で取得する(省電力時はBalanced)', async () => {
    const { unmount } = renderHook(() => useLocationHeartbeat());
    await advanceOneTick();
    expect(mockGetCurrentPositionAsync).toHaveBeenLastCalledWith({
      accuracy: Location.Accuracy.High,
    });
    unmount();

    mockPowerSavingLocationEnabled = true;
    renderHook(() => useLocationHeartbeat());
    await advanceOneTick();

    expect(mockGetCurrentPositionAsync).toHaveBeenLastCalledWith({
      accuracy: Location.Accuracy.Balanced,
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
    const { unmount } = renderHook(() => useLocationHeartbeat());

    await advanceOneTick();
    unmount();
    await act(async () => {
      resolveFirst?.(makeLocation(NOW));
    });
    await advanceOneTick();

    expect(mockGetCurrentPositionAsync).toHaveBeenCalledTimes(1);
    expect(mockHandleTrackingLocation).not.toHaveBeenCalled();
  });

  it('取得に失敗し続けても警告は連続の先頭だけに絞る', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockGetCurrentPositionAsync.mockRejectedValue(
      new Error('位置情報を取得できません')
    );
    renderHook(() => useLocationHeartbeat());

    await advanceOneTick();
    await advanceOneTick();

    expect(mockGetCurrentPositionAsync).toHaveBeenCalledTimes(2);
    expect(warnSpy).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
  });
});
