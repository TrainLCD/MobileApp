import * as Location from 'expo-location'
import { useEffect } from 'react'
import { useRecoilValue } from 'recoil'
import { LOCATION_TASK_NAME } from '../constants'
import { accuracySelector } from '../store/selectors/accuracy'
import { autoModeEnabledSelector } from '../store/selectors/autoMode'
import { translate } from '../translation'

export const useStartBackgroundLocationUpdates = () => {
  const autoModeEnabled = useRecoilValue(autoModeEnabledSelector)
  const locationServiceAccuracy = useRecoilValue(accuracySelector)

  useEffect(() => {
    const startAsync = async () => {
      const isStarted = await Location.hasStartedLocationUpdatesAsync(
        LOCATION_TASK_NAME
      )
      if (isStarted) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME)
      }
      if (!autoModeEnabled) {
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: locationServiceAccuracy,
          activityType: Location.ActivityType.OtherNavigation,
          foregroundService: {
            notificationTitle: translate('bgAlertTitle'),
            notificationBody: translate('bgAlertContent'),
            killServiceOnDestroy: true,
          },
        })
      }
    }
    startAsync()

    return () => {
      Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME)
    }
  }, [autoModeEnabled, locationServiceAccuracy])
}
