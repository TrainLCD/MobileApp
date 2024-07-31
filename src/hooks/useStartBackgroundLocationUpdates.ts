import * as Location from 'expo-location'
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
      if (autoModeEnabled) {
        return
      }

      await Location.startLocationUpdatesAsync(locationTaskName, {
        accuracy: locationServiceAccuracy,
        activityType: Location.ActivityType.OtherNavigation,
        foregroundService: {
          notificationTitle: translate('bgAlertTitle'),
          notificationBody: translate('bgAlertContent'),
          killServiceOnDestroy: true,
        },
      })
    })()

    return () => {
      Location.stopLocationUpdatesAsync(locationTaskName)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
