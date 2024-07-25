import * as Location from 'expo-location'
import { useEffect } from 'react'
import { useRecoilValue } from 'recoil'
import { accuracySelector } from '../store/selectors/accuracy'
import { autoModeEnabledSelector } from '../store/selectors/autoMode'
import { locationServiceDistanceFilterSelector } from '../store/selectors/locationServiceDistanceFilter'
import { translate } from '../translation'
import { locationTaskName } from '../utils/locationTaskName'

export const useStartBackgroundLocationUpdates = () => {
  const autoModeEnabled = useRecoilValue(autoModeEnabledSelector)
  const locationServiceAccuracy = useRecoilValue(accuracySelector)
  const locationServiceDistanceFilter = useRecoilValue(
    locationServiceDistanceFilterSelector
  )

  useEffect(() => {
    if (autoModeEnabled) {
      return
    }

    Location.startLocationUpdatesAsync(locationTaskName, {
      accuracy: locationServiceAccuracy,
      activityType: Location.LocationActivityType.OtherNavigation,
      deferredUpdatesDistance: locationServiceDistanceFilter,
      distanceInterval: 1,
      foregroundService: {
        notificationTitle: translate('bgAlertTitle'),
        notificationBody: translate('bgAlertContent'),
        killServiceOnDestroy: true,
      },
    })

    return () => {
      Location.stopLocationUpdatesAsync(locationTaskName)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
