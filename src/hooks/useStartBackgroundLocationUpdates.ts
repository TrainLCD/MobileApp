import * as Location from 'expo-location';
import { useAtomValue } from 'jotai';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import navigationState from '~/store/atoms/navigation';
import { LOCATION_TASK_NAME, LOCATION_TASK_OPTIONS } from '../constants';
import { translate } from '../translation';
import { useLocationPermissionsGranted } from './useLocationPermissionsGranted';
import { setLocation } from './useLocationStore';

export const useStartBackgroundLocationUpdates = () => {
  const bgPermGranted = useLocationPermissionsGranted();
  const { autoModeEnabled } = useAtomValue(navigationState);

  useEffect(() => {
    if (autoModeEnabled || !bgPermGranted) {
      return;
    }

    if (AppState.currentState === 'active') {
      Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
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
    }

    return () => {
      Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    };
  }, [autoModeEnabled, bgPermGranted]);

  useEffect(() => {
    let watchPositionSub: Location.LocationSubscription | null = null;

    if (autoModeEnabled || bgPermGranted) {
      return;
    }

    (async () => {
      watchPositionSub = await Location.watchPositionAsync(
        LOCATION_TASK_OPTIONS,
        setLocation
      );
    })();

    return () => {
      watchPositionSub?.remove();
    };
  }, [autoModeEnabled, bgPermGranted]);
};
