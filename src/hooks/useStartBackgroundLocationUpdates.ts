import * as Location from 'expo-location'
import * as TaskManager from 'expo-task-manager'
import { useEffect } from 'react'
import { useRecoilValue } from 'recoil'
import { accuracySelector } from '../store/selectors/accuracy'
import { autoModeEnabledSelector } from '../store/selectors/autoMode'
import { translate } from '../translation'
import { locationTaskName } from '../utils/locationTaskName'

export const useStartBackgroundLocationUpdates = () => {
  const autoModeEnabled = useRecoilValue(autoModeEnabledSelector)
  const locationServiceAccuracy = useRecoilValue(accuracySelector)

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-extra-semi
    ;(async () => {
      await TaskManager.unregisterAllTasksAsync()

      if (autoModeEnabled) {
        return
      }

      await Location.startLocationUpdatesAsync(locationTaskName, {
        accuracy: locationServiceAccuracy,
        foregroundService: {
          notificationTitle: translate('bgAlertTitle'),
          notificationBody: translate('bgAlertContent'),
          killServiceOnDestroy: true,
        },
      })
    })()

    return () => {
      TaskManager.unregisterAllTasksAsync()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
