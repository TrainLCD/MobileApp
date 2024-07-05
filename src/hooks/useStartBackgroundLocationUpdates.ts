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
      Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).then(
        (started) => {
          if (!started && !autoModeEnabled) {
            Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
              accuracy: locationServiceAccuracy,
              foregroundService: {
                notificationTitle: translate('bgAlertTitle'),
                notificationBody: translate('bgAlertContent'),
                killServiceOnDestroy: true,
              },
            }).catch((err) => {
              throw err
            })
          }
        }
      )

      return () => {
        Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME)
      }
    }, [autoModeEnabled, locationServiceAccuracy])
  )
}
