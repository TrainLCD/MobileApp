import { renderHook } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { LOCATION_TASK_NAME, LOCATION_TASK_OPTIONS } from '../constants';
import { useLocationPermissionsGranted } from './useLocationPermissionsGranted';
import { useStartBackgroundLocationUpdates } from './useStartBackgroundLocationUpdates';

jest.mock('expo-location');
jest.mock('./useLocationPermissionsGranted');
jest.mock('~/store/atoms/location', () => ({
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
const mockWatchPositionAsync = Location.watchPositionAsync as jest.Mock;

// jotai useAtomValueのモック
let mockAutoModeEnabled = false;
jest.mock('jotai', () => ({
  ...jest.requireActual('jotai'),
  useAtomValue: jest.fn(() => ({ autoModeEnabled: mockAutoModeEnabled })),
}));

describe('useStartBackgroundLocationUpdates', () => {
  const mockRemove = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockAutoModeEnabled = false;
    mockStartLocationUpdatesAsync.mockResolvedValue(undefined);
    mockStopLocationUpdatesAsync.mockResolvedValue(undefined);
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

    test('should handle startLocationUpdatesAsync error gracefully', async () => {
      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {});
      mockStartLocationUpdatesAsync.mockRejectedValue(
        new Error('Permission denied')
      );
      mockAutoModeEnabled = false;
      mockUseLocationPermissionsGranted.mockReturnValue(true);

      renderHook(() => useStartBackgroundLocationUpdates());

      await new Promise(process.nextTick);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'バックグラウンド位置情報の更新開始に失敗しました:',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('foreground location watch (fallback)', () => {
    test('should start watchPositionAsync when bgPermGranted=false and autoModeEnabled=false', async () => {
      mockAutoModeEnabled = false;
      mockUseLocationPermissionsGranted.mockReturnValue(false);

      renderHook(() => useStartBackgroundLocationUpdates());

      await new Promise(process.nextTick);

      expect(mockWatchPositionAsync).toHaveBeenCalledWith(
        LOCATION_TASK_OPTIONS,
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

    test('should not start watchPositionAsync when bgPermGranted=true', async () => {
      mockAutoModeEnabled = false;
      mockUseLocationPermissionsGranted.mockReturnValue(true);

      renderHook(() => useStartBackgroundLocationUpdates());

      await new Promise(process.nextTick);

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
});
