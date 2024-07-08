import * as Location from 'expo-location'
import { useEffect, useRef } from 'react'
import { useRecoilValue } from 'recoil'
import { LOCATION_TASK_NAME } from '../constants'
import { accuracySelector } from '../store/selectors/accuracy'
import { autoModeEnabledSelector } from '../store/selectors/autoMode'
import { translate } from '../translation'

export const useStartBackgroundLocationUpdates = () => {
  const autoModeEnabled = useRecoilValue(autoModeEnabledSelector)
  const locationServiceAccuracy = useRecoilValue(accuracySelector)

  const autoModeEnabledRef = useRef(autoModeEnabled)
  const locationServiceAccuracyRef = useRef(locationServiceAccuracy)

  useEffect(() => {
    if (!autoModeEnabledRef.current) {
      Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: locationServiceAccuracyRef.current,
        activityType: Location.LocationActivityType.OtherNavigation,
        foregroundService: {
          notificationTitle: translate('bgAlertTitle'),
          notificationBody: translate('bgAlertContent'),
          killServiceOnDestroy: true,
        },
      })
    }

    return () => {
      Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME)
    }
  }, [])
}
