import * as Location from 'expo-location'
import { useEffect } from 'react'
import { useRecoilValue } from 'recoil'
import { autoModeEnabledSelector } from '../store/selectors/autoMode'
import { translate } from '../translation'
import { locationTaskName } from '../utils/locationTaskName'

export const useStartBackgroundLocationUpdates = () => {
  const autoModeEnabled = useRecoilValue(autoModeEnabledSelector)

  useEffect(() => {
    if (autoModeEnabled) {
      return
    }
    Location.startLocationUpdatesAsync(locationTaskName, {
      accuracy: Location.Accuracy.High,
      activityType: Location.ActivityType.OtherNavigation,
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
