import * as Location from 'expo-location';
import { useAtomValue } from 'jotai';
import { useEffect } from 'react';
import { setLocation } from '~/store/atoms/location';
import navigationState from '~/store/atoms/navigation';
import { LOCATION_TASK_NAME, LOCATION_TASK_OPTIONS } from '../constants';
import { translate } from '../translation';
import { useLocationPermissionsGranted } from './useLocationPermissionsGranted';

export const useStartBackgroundLocationUpdates = () => {
  const bgPermGranted = useLocationPermissionsGranted();
  const { autoModeEnabled } = useAtomValue(navigationState);

  useEffect(() => {
    if (autoModeEnabled || !bgPermGranted) {
      return;
    }

    (async () => {
      try {
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          ...LOCATION_TASK_OPTIONS,
          // NOTE: マップマッチが勝手に行われると電車での経路と大きく異なることがあるはずなので
          // OtherNavigationは必須
          activityType: Location.ActivityType.OtherNavigation,
          foregroundService: {
            notificationTitle: translate('bgAlertTitle'),
            notificationBody: translate('bgAlertContent'),
            killServiceOnDestroy: true,
          },
        });
      } catch (error) {
        console.warn(
          'バックグラウンド位置情報の更新開始に失敗しました:',
          error
        );
      }
    })();

    return () => {
      Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME).catch((error) => {
        console.warn(
          'バックグラウンド位置情報の更新停止に失敗しました:',
          error
        );
      });
    };
  }, [autoModeEnabled, bgPermGranted]);

  useEffect(() => {
    let watchPositionSub: Location.LocationSubscription | null = null;

    if (autoModeEnabled || bgPermGranted) {
      return;
    }

    (async () => {
      try {
        watchPositionSub = await Location.watchPositionAsync(
          LOCATION_TASK_OPTIONS,
          setLocation
        );
      } catch (error) {
        console.warn('位置情報の監視開始に失敗しました:', error);
      }
    })();

    return () => {
      watchPositionSub?.remove();
    };
  }, [autoModeEnabled, bgPermGranted]);
};
