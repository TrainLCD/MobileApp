import * as Location from 'expo-location';
import { useEffect } from 'react';
import { LOCATION_TASK_NAME } from '../constants';
import { translate } from '../translation';
import { useApplicationFlagStore } from './useApplicationFlagStore';
import { useLocationPermissionsGranted } from './useLocationPermissionsGranted';
import { setLocation } from './useLocationStore';

export const useStartBackgroundLocationUpdates = () => {
  const bgPermGranted = useLocationPermissionsGranted();

  useEffect(() => {
    const autoModeEnabled = useApplicationFlagStore.getState()?.autoModeEnabled;
    if (autoModeEnabled) {
      return;
    }

    let watchPositionSub: Location.LocationSubscription | null = null;

    (async () => {
      try {
        if (bgPermGranted) {
          await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
            // NOTE: BestForNavigationにしたら暴走時のCPU使用率が50%ほど低下した
            accuracy: Location.Accuracy.BestForNavigation,
            // NOTE: マップマッチが勝手に行われると電車での経路と大きく異なることがあるはずなので
            // OtherNavigationは必須
            activityType: Location.ActivityType.OtherNavigation,
            timeInterval: 5000,
            distanceInterval: 10,
            foregroundService: {
              notificationTitle: translate('bgAlertTitle'),
              notificationBody: translate('bgAlertContent'),
              killServiceOnDestroy: true,
            },
          });
        }
      } catch (err) {
        console.error(err);
      }

      try {
        if (!bgPermGranted) {
          watchPositionSub = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.BestForNavigation,
              timeInterval: 5000,
              distanceInterval: 10,
            },
            setLocation
          );
        }
      } catch (err) {
        console.error(err);
      }
    })();

    return () => {
      Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      watchPositionSub?.remove();
    };
  }, [bgPermGranted]);
};
