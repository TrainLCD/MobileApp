import * as Location from 'expo-location'
import { useEffect } from 'react'
import { LOCATION_TASK_NAME } from '../constants'
import { translate } from '../translation'
import { useApplicationFlagStore } from './useApplicationFlagStore'

export const useStartBackgroundLocationUpdates = () => {
  useEffect(() => {
    const autoModeEnabled = useApplicationFlagStore.getState()?.autoModeEnabled
    if (autoModeEnabled) {
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-extra-semi
    ;(async () => {
      if (
        !(await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME))
      ) {
        Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.High,
          distanceInterval: 100,
          foregroundService: {
            notificationTitle: translate('bgAlertTitle'),
            notificationBody: translate('bgAlertContent'),
            killServiceOnDestroy: true,
          },
        })
      }
    })()

    return () => {
      Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME).catch(console.debug)
    }
  }, [])
}
