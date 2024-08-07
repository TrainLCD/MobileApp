import * as Location from 'expo-location'
import { useEffect } from 'react'
import { translate } from '../translation'
import { locationTaskName } from '../utils/locationTaskName'
import { useApplicationFlagStore } from './useApplicationFlagStore'

export const useStartBackgroundLocationUpdates = () => {
  useEffect(() => {
    const autoModeEnabled = useApplicationFlagStore.getState()?.autoModeEnabled
    if (autoModeEnabled) {
      return
    }
    Location.startLocationUpdatesAsync(locationTaskName, {
      accuracy: Location.Accuracy.High,
      activityType: Location.ActivityType.OtherNavigation,
      foregroundService: {
        notificationTitle: translate('bgAlertTitle'),
        notificationBody: translate('bgAlertContent'),
        killServiceOnDestroy: true,
      },
    })

    return () => {
      Location.stopLocationUpdatesAsync(locationTaskName).catch(console.debug)
    }
  }, [])
}
