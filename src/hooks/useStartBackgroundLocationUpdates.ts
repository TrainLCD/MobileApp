import { useFocusEffect } from '@react-navigation/native'
import * as Location from 'expo-location'
import { useCallback } from 'react'
import { useRecoilValue } from 'recoil'
import { LOCATION_TASK_NAME } from '../constants'
import { accuracySelector } from '../store/selectors/accuracy'
import { autoModeEnabledSelector } from '../store/selectors/autoMode'
import { translate } from '../translation'

export const useStartBackgroundLocationUpdates = () => {
  const autoModeEnabled = useRecoilValue(autoModeEnabledSelector)
  const locationServiceAccuracy = useRecoilValue(accuracySelector)

  useFocusEffect(
    useCallback(() => {
      if (!autoModeEnabled) {
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
    }, [autoModeEnabled, locationServiceAccuracy])
  )
}
