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
          // NOTE: BestForNavigationにしたら暴走時のCPU使用率が50%ほど低下した
          accuracy: Location.Accuracy.High,
          // NOTE: マップマッチが勝手に行われると電車での経路と大きく異なることがあるはずなので
          // OtherNavigationは必須
          activityType: Location.ActivityType.OtherNavigation,
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
