/**
 * 補完測位の「実際の取得間隔」を、handleTrackingLocation をモックせずに測る。
 *
 * useLocationHeartbeat.test.tsx は getLastTrackedLocationAtMs と
 * handleTrackingLocation を独立したモックにしているため、「補完測位が取り込んだ測位が
 * 自分自身の途絶判定を巻き戻す」というフィードバックが再現されない。実装が固定間隔の
 * タイマーだったときはこの経路のせいで取得が20秒おきになっていたが、そのバグは
 * あちらのテストでは1件も落ちなかった。ここだけ実物の handleTrackingLocation を通し、
 * 取得間隔そのものを固定する。
 */
import { act, renderHook } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { LOCATION_HEARTBEAT_STALE_THRESHOLD } from '../constants/location';
import { resetTrackingLocationDedup } from '../utils/handleTrackingLocation';
import { useLocationHeartbeat } from './useLocationHeartbeat';

jest.mock('expo-location');

jest.mock('expo-battery', () => ({
  useLowPowerMode: () => false,
}));

jest.mock('./useIsAppForeground', () => ({
  useIsAppForeground: () => true,
}));

// handleTrackingLocation の下流(ストア)だけ止める。フック → handleTrackingLocation →
// 配信時刻の記録、という経路は実物のまま通す。
jest.mock('~/store/atoms/location', () => ({
  setLocation: jest.fn(),
  setRawLocation: jest.fn(),
  setLocationAccuracyOutlier: jest.fn(),
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
jest.mock('jotai', () => ({
  ...jest.requireActual('jotai'),
  useAtomValue: jest.fn(() => false),
}));

const mockWatchPositionAsync = Location.watchPositionAsync as jest.Mock;
const mockGetForegroundPermissionsAsync =
  Location.getForegroundPermissionsAsync as jest.Mock;

const NOW = 1_700_000_000_000;
// 購読を張ってから測位が届くまでの時間。0だと固定間隔の実装でも間隔が合ってしまい、
// 退行を捕まえられない(自分の測位が次の点検の直前に届くことが、間隔が倍に開く条件そのもの)。
const RESPONSE_LATENCY_MS = 1_500;
const OBSERVE_MS = 60_000;
const STEP_MS = 250;

describe('useLocationHeartbeat の取得間隔', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    resetTrackingLocationDedup();
    mockGetForegroundPermissionsAsync.mockResolvedValue({ granted: true });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('継続測位が完全に途絶している間、途絶時間を超えて取得が空かない', async () => {
    const requestedAt: number[] = [];
    mockWatchPositionAsync.mockImplementation(
      (
        _options: Location.LocationOptions,
        callback: (location: Location.LocationObject) => void
      ) => {
        requestedAt.push(Date.now());
        // 実機と同じく、購読を張ってから測位が届くまでに時間がかかる。
        setTimeout(() => {
          callback({
            coords: {
              latitude: 35.681236,
              longitude: 139.767125,
              accuracy: 30,
              altitude: 0,
              altitudeAccuracy: 0,
              heading: 0,
              speed: 0,
            },
            timestamp: Date.now(),
          });
        }, RESPONSE_LATENCY_MS);
        return Promise.resolve({ remove: jest.fn() });
      }
    );

    renderHook(() => useLocationHeartbeat());
    await act(async () => {});

    for (let elapsed = 0; elapsed < OBSERVE_MS; elapsed += STEP_MS) {
      await act(async () => {
        jest.advanceTimersByTime(STEP_MS);
      });
    }

    // 購読と購読の間隔が途絶時間+配信までの時間を超えない = 更新が10秒台で回り続ける。
    // 固定間隔の実装ではここが約20秒になり落ちる。
    const gaps = requestedAt
      .slice(1)
      .map((t, i) => t - (requestedAt[i] as number));
    expect(requestedAt.length).toBeGreaterThanOrEqual(5);
    for (const gap of gaps) {
      expect(gap).toBeLessThanOrEqual(
        LOCATION_HEARTBEAT_STALE_THRESHOLD + RESPONSE_LATENCY_MS + STEP_MS
      );
    }
  });
});
