import * as Location from 'expo-location'
import { useEffect } from 'react'
import { useRecoilValue } from 'recoil'
import { LOCATION_TASK_NAME } from '../constants'
import stationState from '../store/atoms/station'
import { accuracySelector } from '../store/selectors/accuracy'
import { autoModeEnabledSelector } from '../store/selectors/autoMode'
import { translate } from '../translation'

export const useStartBackgroundLocationUpdates = () => {
  const autoModeEnabled = useRecoilValue(autoModeEnabledSelector)
  const locationServiceAccuracy = useRecoilValue(accuracySelector)
  const { selectedBound } = useRecoilValue(stationState)

  useEffect(() => {
    if (!autoModeEnabled && selectedBound) {
      Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: locationServiceAccuracy,
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
  }, [autoModeEnabled, locationServiceAccuracy, selectedBound])
}
