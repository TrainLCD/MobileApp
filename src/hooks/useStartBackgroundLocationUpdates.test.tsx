import { renderHook } from '@testing-library/react-native';
import * as Location from 'expo-location';
import {
  LOCATION_START_MAX_RETRIES,
  LOCATION_TASK_NAME,
  LOCATION_TASK_OPTIONS,
  LOCATION_WATCH_OPTIONS,
} from '../constants';
import { useLocationPermissionsGranted } from './useLocationPermissionsGranted';
import { useStartBackgroundLocationUpdates } from './useStartBackgroundLocationUpdates';

let mockNeedsJobSchedulerBypass = false;
jest.mock('../constants/native', () => ({
  get NEEDS_JOBSCHEDULER_BYPASS() {
    return mockNeedsJobSchedulerBypass;
  },
}));

jest.mock('expo-location');
jest.mock('./useLocationPermissionsGranted');
jest.mock('~/store', () => ({
  store: { set: jest.fn() },
}));
jest.mock('~/store/atoms/location', () => ({
  backgroundLocationTrackingAtom: {},
  setLocation: jest.fn(),
}));
jest.mock('~/store/atoms/navigation', () => ({
  __esModule: true,
  default: {},
}));

const mockUseLocationPermissionsGranted =
  useLocationPermissionsGranted as jest.Mock;
const mockStartLocationUpdatesAsync =
  Location.startLocationUpdatesAsync as jest.Mock;
const mockStopLocationUpdatesAsync =
  Location.stopLocationUpdatesAsync as jest.Mock;
const mockHasStartedLocationUpdatesAsync =
  Location.hasStartedLocationUpdatesAsync as jest.Mock;
const mockWatchPositionAsync = Location.watchPositionAsync as jest.Mock;

// jotai useAtomValueのモック
let mockAutoModeEnabled = false;
jest.mock('jotai', () => ({
  ...jest.requireActual('jotai'),
  useAtomValue: jest.fn(() => ({ autoModeEnabled: mockAutoModeEnabled })),
}));

describe('useStartBackgroundLocationUpdates', () => {
  const mockRemove = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    // React Testing Libraryのauto-cleanupはafterEachでフックをunmountし、
    // effectクリーンアップ（stopLocationUpdatesAsync等）を発火する。
    // このクリーンアップは登録順の関係でafterEachよりも後に実行されるため、
    // beforeEachでもclearAllMocksを行い、前テストの残留呼び出しを確実にリセットする。
    jest.clearAllMocks();
    mockAutoModeEnabled = false;
    mockNeedsJobSchedulerBypass = false;
    mockStartLocationUpdatesAsync.mockResolvedValue(undefined);
    mockStopLocationUpdatesAsync.mockResolvedValue(undefined);
    mockHasStartedLocationUpdatesAsync.mockResolvedValue(false);
    mockWatchPositionAsync.mockResolvedValue({ remove: mockRemove });
  });

  describe('background location updates', () => {
    test('should start background location updates when bgPermGranted=true and autoModeEnabled=false', async () => {
      mockAutoModeEnabled = false;
      mockUseLocationPermissionsGranted.mockReturnValue(true);

      renderHook(() => useStartBackgroundLocationUpdates());

      await new Promise(process.nextTick);

      expect(mockStartLocationUpdatesAsync).toHaveBeenCalledWith(
        LOCATION_TASK_NAME,
        expect.objectContaining({
          ...LOCATION_TASK_OPTIONS,
          activityType: Location.ActivityType.OtherNavigation,
          foregroundService: expect.objectContaining({
            killServiceOnDestroy: false,
          }),
        })
      );
    });

    test('should not start background location updates when autoModeEnabled=true', async () => {
      mockAutoModeEnabled = true;
      mockUseLocationPermissionsGranted.mockReturnValue(true);

      renderHook(() => useStartBackgroundLocationUpdates());

      await new Promise(process.nextTick);

      expect(mockStartLocationUpdatesAsync).not.toHaveBeenCalled();
    });

    test('should not start background location updates when bgPermGranted=false', async () => {
      mockAutoModeEnabled = false;
      mockUseLocationPermissionsGranted.mockReturnValue(false);

      renderHook(() => useStartBackgroundLocationUpdates());

      await new Promise(process.nextTick);

      expect(mockStartLocationUpdatesAsync).not.toHaveBeenCalled();
    });

    test('should stop background location updates on cleanup', async () => {
      mockAutoModeEnabled = false;
      mockUseLocationPermissionsGranted.mockReturnValue(true);

      const { unmount } = renderHook(() => useStartBackgroundLocationUpdates());

      await new Promise(process.nextTick);

      unmount();

      expect(mockStopLocationUpdatesAsync).toHaveBeenCalledWith(
        LOCATION_TASK_NAME
      );
    });

    test('should stop stale location task before starting new one', async () => {
      mockHasStartedLocationUpdatesAsync.mockResolvedValue(true);
      mockAutoModeEnabled = false;
      mockUseLocationPermissionsGranted.mockReturnValue(true);

      renderHook(() => useStartBackgroundLocationUpdates());

      await new Promise(process.nextTick);

      expect(mockHasStartedLocationUpdatesAsync).toHaveBeenCalledWith(
        LOCATION_TASK_NAME
      );
      expect(mockStopLocationUpdatesAsync).toHaveBeenCalledWith(
        LOCATION_TASK_NAME
      );
      expect(mockStartLocationUpdatesAsync).toHaveBeenCalled();

      // stopがstartより先に呼ばれていることを検証
      const stopOrder =
        mockStopLocationUpdatesAsync.mock.invocationCallOrder[0];
      const startOrder =
        mockStartLocationUpdatesAsync.mock.invocationCallOrder[0];
      expect(stopOrder).toBeLessThan(startOrder);
    });

    test('should not stop when no stale task exists', async () => {
      mockHasStartedLocationUpdatesAsync.mockResolvedValue(false);
      mockAutoModeEnabled = false;
      mockUseLocationPermissionsGranted.mockReturnValue(true);

      const { unmount } = renderHook(() => useStartBackgroundLocationUpdates());

      await new Promise(process.nextTick);

      expect(mockHasStartedLocationUpdatesAsync).toHaveBeenCalledWith(
        LOCATION_TASK_NAME
      );
      // 残存タスクがないためstopはまだ呼ばれていない
      expect(mockStopLocationUpdatesAsync).not.toHaveBeenCalled();
      expect(mockStartLocationUpdatesAsync).toHaveBeenCalled();

      // アンマウント時のクリーンアップでstopが呼ばれることを確認
      unmount();
      expect(mockStopLocationUpdatesAsync).toHaveBeenCalledWith(
        LOCATION_TASK_NAME
      );
    });

    test('should continue starting even if stale task cleanup fails', async () => {
      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {});
      mockHasStartedLocationUpdatesAsync.mockRejectedValue(
        new Error('Check failed')
      );
      mockAutoModeEnabled = false;
      mockUseLocationPermissionsGranted.mockReturnValue(true);

      renderHook(() => useStartBackgroundLocationUpdates());

      await new Promise(process.nextTick);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '前回セッションの位置情報タスクの停止に失敗しました:',
        expect.any(Error)
      );
      expect(mockStartLocationUpdatesAsync).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    test('should retry startLocationUpdatesAsync on failure and succeed', async () => {
      jest.useFakeTimers();
      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {});
      mockStartLocationUpdatesAsync
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce(undefined);
      mockAutoModeEnabled = false;
      mockUseLocationPermissionsGranted.mockReturnValue(true);

      renderHook(() => useStartBackgroundLocationUpdates());

      // 初回失敗
      await jest.advanceTimersByTimeAsync(0);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        `バックグラウンド位置情報の更新開始に失敗しました（リトライ 1/${LOCATION_START_MAX_RETRIES}）:`,
        expect.any(Error)
      );

      // リトライ待機（1000ms）後に成功
      await jest.advanceTimersByTimeAsync(1000);

      expect(mockStartLocationUpdatesAsync).toHaveBeenCalledTimes(2);

      consoleWarnSpy.mockRestore();
      jest.useRealTimers();
    });

    test('should log final error after all retries exhausted', async () => {
      jest.useFakeTimers();
      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {});
      mockStartLocationUpdatesAsync.mockRejectedValue(
        new Error('Persistent failure')
      );
      mockAutoModeEnabled = false;
      mockUseLocationPermissionsGranted.mockReturnValue(true);

      renderHook(() => useStartBackgroundLocationUpdates());

      // 初回 + リトライ3回分すべて実行
      for (let i = 0; i <= LOCATION_START_MAX_RETRIES; i++) {
        await jest.advanceTimersByTimeAsync(1000 * 2 ** i);
      }

      expect(mockStartLocationUpdatesAsync).toHaveBeenCalledTimes(
        LOCATION_START_MAX_RETRIES + 1
      );
      expect(consoleWarnSpy).toHaveBeenLastCalledWith(
        'バックグラウンド位置情報の更新開始に失敗しました（リトライ上限到達）:',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
      jest.useRealTimers();
    });

    test('should stop location updates if cancelled during startLocationUpdatesAsync', async () => {
      mockAutoModeEnabled = false;
      mockUseLocationPermissionsGranted.mockReturnValue(true);

      // startLocationUpdatesAsyncが解決する前にunmountされるケースをシミュレート
      let resolveStart: () => void = () => {};
      mockStartLocationUpdatesAsync.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveStart = resolve;
          })
      );

      const { unmount } = renderHook(() => useStartBackgroundLocationUpdates());

      // hasStartedLocationUpdatesAsyncの解決を待ち、startLocationUpdatesAsyncに到達させる
      await new Promise(process.nextTick);

      // startが進行中の間にクリーンアップ
      unmount();

      // startが完了
      resolveStart();
      await new Promise(process.nextTick);

      // クリーンアップのstop + cancelled検知後のstopで2回呼ばれる
      expect(mockStopLocationUpdatesAsync).toHaveBeenCalledTimes(2);
      expect(mockStopLocationUpdatesAsync).toHaveBeenCalledWith(
        LOCATION_TASK_NAME
      );
    });

    test('should not retry when cancelled stop fails after successful start', async () => {
      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {});
      mockAutoModeEnabled = false;
      mockUseLocationPermissionsGranted.mockReturnValue(true);

      let resolveStart: () => void = () => {};
      mockStartLocationUpdatesAsync.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveStart = resolve;
          })
      );
      mockStopLocationUpdatesAsync.mockRejectedValue(new Error('Stop failed'));

      const { unmount } = renderHook(() => useStartBackgroundLocationUpdates());

      // hasStartedLocationUpdatesAsyncの解決を待ち、startLocationUpdatesAsyncに到達させる
      await new Promise(process.nextTick);

      // startが進行中の間にクリーンアップ
      unmount();

      // startが完了 → cancelled=trueなのでstopを試みるが失敗する
      resolveStart();
      await new Promise(process.nextTick);

      // startは1回だけ（stop失敗でリトライされない）
      expect(mockStartLocationUpdatesAsync).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'バックグラウンド位置情報の更新停止に失敗しました:',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });

    test('should stop retrying on cleanup', async () => {
      jest.useFakeTimers();
      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {});
      mockStartLocationUpdatesAsync.mockRejectedValue(new Error('Failure'));
      mockAutoModeEnabled = false;
      mockUseLocationPermissionsGranted.mockReturnValue(true);

      const { unmount } = renderHook(() => useStartBackgroundLocationUpdates());

      // 初回失敗
      await jest.advanceTimersByTimeAsync(0);

      expect(mockStartLocationUpdatesAsync).toHaveBeenCalledTimes(1);

      // クリーンアップでリトライを中止
      unmount();

      // リトライ待機時間を経過させてもこれ以上呼ばれない
      await jest.advanceTimersByTimeAsync(10000);

      expect(mockStartLocationUpdatesAsync).toHaveBeenCalledTimes(1);

      consoleWarnSpy.mockRestore();
      jest.useRealTimers();
    });
  });

  describe('foreground location watch (fallback)', () => {
    test('should start watchPositionAsync when bgPermGranted=false and autoModeEnabled=false', async () => {
      mockAutoModeEnabled = false;
      mockUseLocationPermissionsGranted.mockReturnValue(false);

      renderHook(() => useStartBackgroundLocationUpdates());

      await new Promise(process.nextTick);

      expect(mockWatchPositionAsync).toHaveBeenCalledWith(
        LOCATION_WATCH_OPTIONS,
        expect.any(Function)
      );
    });

    test('should not start watchPositionAsync when autoModeEnabled=true', async () => {
      mockAutoModeEnabled = true;
      mockUseLocationPermissionsGranted.mockReturnValue(false);

      renderHook(() => useStartBackgroundLocationUpdates());

      await new Promise(process.nextTick);

      expect(mockWatchPositionAsync).not.toHaveBeenCalled();
    });

    test('should not start watchPositionAsync when bgPermGranted=true and NEEDS_JOBSCHEDULER_BYPASS=false', async () => {
      mockAutoModeEnabled = false;
      mockUseLocationPermissionsGranted.mockReturnValue(true);

      renderHook(() => useStartBackgroundLocationUpdates());

      await new Promise(process.nextTick);

      // JobSchedulerバイパスが不要なプラットフォームではwatchPositionAsyncは呼ばれない
      expect(mockWatchPositionAsync).not.toHaveBeenCalled();
    });

    test('should remove watch subscription on cleanup', async () => {
      mockAutoModeEnabled = false;
      mockUseLocationPermissionsGranted.mockReturnValue(false);

      const { unmount } = renderHook(() => useStartBackgroundLocationUpdates());

      await new Promise(process.nextTick);

      unmount();

      expect(mockRemove).toHaveBeenCalled();
    });

    test('should handle watchPositionAsync error gracefully', async () => {
      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {});
      mockWatchPositionAsync.mockRejectedValue(new Error('Watch failed'));
      mockAutoModeEnabled = false;
      mockUseLocationPermissionsGranted.mockReturnValue(false);

      renderHook(() => useStartBackgroundLocationUpdates());

      await new Promise(process.nextTick);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '位置情報の監視開始に失敗しました:',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('background mode direct callback (JobScheduler bypass)', () => {
    beforeEach(() => {
      mockNeedsJobSchedulerBypass = true;
    });

    test('should start watchPositionAsync when NEEDS_JOBSCHEDULER_BYPASS=true', async () => {
      mockAutoModeEnabled = false;
      mockUseLocationPermissionsGranted.mockReturnValue(true);

      renderHook(() => useStartBackgroundLocationUpdates());

      await new Promise(process.nextTick);

      expect(mockWatchPositionAsync).toHaveBeenCalledWith(
        LOCATION_WATCH_OPTIONS,
        expect.any(Function)
      );
    });

    test('should not start watchPositionAsync when NEEDS_JOBSCHEDULER_BYPASS=false', async () => {
      mockNeedsJobSchedulerBypass = false;
      mockAutoModeEnabled = false;
      mockUseLocationPermissionsGranted.mockReturnValue(true);

      renderHook(() => useStartBackgroundLocationUpdates());

      await new Promise(process.nextTick);

      expect(mockWatchPositionAsync).not.toHaveBeenCalled();
    });

    test('should remove watch subscription on cleanup when bgPermGranted=true', async () => {
      mockAutoModeEnabled = false;
      mockUseLocationPermissionsGranted.mockReturnValue(true);

      const { unmount } = renderHook(() => useStartBackgroundLocationUpdates());

      await new Promise(process.nextTick);

      unmount();

      expect(mockRemove).toHaveBeenCalled();
    });

    test('should handle direct callback watchPositionAsync failure gracefully', async () => {
      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {});
      mockWatchPositionAsync.mockRejectedValue(
        new Error('Direct callback failed')
      );
      mockAutoModeEnabled = false;
      mockUseLocationPermissionsGranted.mockReturnValue(true);

      renderHook(() => useStartBackgroundLocationUpdates());

      await new Promise(process.nextTick);

      // watchPositionAsyncが失敗してもstartLocationUpdatesAsyncは成功している
      expect(mockStartLocationUpdatesAsync).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '直接位置情報コールバックの開始に失敗しました:',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });
  });
});
