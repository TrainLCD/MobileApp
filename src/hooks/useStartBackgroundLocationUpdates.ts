import * as Location from 'expo-location'
import { useEffect } from 'react'
import { useRecoilValue } from 'recoil'
import { LOCATION_TASK_NAME } from '../constants'
import { accuracySelector } from '../store/selectors/accuracy'
import { autoModeEnabledSelector } from '../store/selectors/autoMode'
import { locationServiceDistanceFilterSelector } from '../store/selectors/locationServiceDistanceFilter'
import { translate } from '../translation'

export const useStartBackgroundLocationUpdates = () => {
  const autoModeEnabled = useRecoilValue(autoModeEnabledSelector)
  const locationServiceAccuracy = useRecoilValue(accuracySelector)
  const locationServiceDistanceFilter = useRecoilValue(
    locationServiceDistanceFilterSelector
  )

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-extra-semi
    ;(async () => {
      if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME)
      }

      if (autoModeEnabled) {
        return
      }

      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: locationServiceAccuracy,
        activityType: Location.LocationActivityType.OtherNavigation,
        deferredUpdatesDistance: locationServiceDistanceFilter,
        foregroundService: {
          notificationTitle: translate('bgAlertTitle'),
          notificationBody: translate('bgAlertContent'),
          killServiceOnDestroy: true,
        },
      })
    })()

    return () => {
      Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
