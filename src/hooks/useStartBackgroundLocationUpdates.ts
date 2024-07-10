import * as Location from 'expo-location'
import { useEffect, useRef } from 'react'
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

  const autoModeEnabledRef = useRef(autoModeEnabled)
  const locationServiceAccuracyRef = useRef(locationServiceAccuracy)
  const locationServiceDistanceFilterRef = useRef(locationServiceDistanceFilter)

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-extra-semi
    ;(async () => {
      if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME)
      }

      if (autoModeEnabledRef.current) {
        return
      }

      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: locationServiceAccuracyRef.current,
        activityType: Location.LocationActivityType.OtherNavigation,
        deferredUpdatesDistance: locationServiceDistanceFilterRef.current,
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
  }, [])
}
