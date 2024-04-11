import * as Location from 'expo-location'
import { useEffect, useRef } from 'react'
import { useRecoilValue } from 'recoil'
import { LOCATION_TASK_NAME } from '../constants'
import navigationState from '../store/atoms/navigation'
import { accuracySelector } from '../store/selectors/accuracy'
import { translate } from '../translation'

export const useStartBackgroundLocationUpdates = () => {
  const { autoModeEnabled } = useRecoilValue(navigationState)
  const { locationServiceAccuracy, locationServiceDistanceFilter } =
    useRecoilValue(accuracySelector)

  const autoModeEnabledRef = useRef(autoModeEnabled)
  const locationAccuracyRef = useRef(locationServiceAccuracy)
  const locationServiceDistanceFilterRef = useRef(locationServiceDistanceFilter)

  useEffect(() => {
    const startAsync = async () => {
      const isStarted = await Location.hasStartedLocationUpdatesAsync(
        LOCATION_TASK_NAME
      )
      if (isStarted) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME)
      }
      if (!autoModeEnabledRef.current) {
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: locationAccuracyRef.current,
          distanceInterval: locationServiceDistanceFilterRef.current,
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
  }, [])
}
