import * as Location from 'expo-location'
import React, { useCallback, useEffect, useState } from 'react'
import { Alert } from 'react-native'
import { useRecoilValue, useSetRecoilState } from 'recoil'
import useConnectivity from '../hooks/useConnectivity'
import useFetchNearbyStation from '../hooks/useFetchNearbyStation'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import { translate } from '../translation'
import ErrorScreen from './ErrorScreen'
import Permitted from './Permitted'
import { useUnderMaintenance } from '../hooks/useUnderMaintenance'

type Props = {
  children: React.ReactNode
}

const Layout: React.FC<Props> = ({ children }: Props) => {
  const { station, fetchStationError: errorFromState } =
    useRecoilValue(stationState)
  const setNavigationState = useSetRecoilState(navigationState)
  const [enableRetry, setEnableRetry] = useState(true)

  const fetchNearbyStationFunc = useFetchNearbyStation()
  const isUnderMaintenance = useUnderMaintenance()

  const refresh = useCallback(async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })
      await fetchNearbyStationFunc(location)
    } catch (err) {
      Alert.alert(translate('errorTitle'), translate('fetchLocationFailed'), [
        { text: 'OK' },
      ])
    }
  }, [fetchNearbyStationFunc])

  useEffect(() => {
    const checkPermissionsAsync = async () => {
      setEnableRetry(false)
      const { status } = await Location.getForegroundPermissionsAsync()
      if (status === Location.PermissionStatus.GRANTED) {
        setNavigationState((prev) => ({
          ...prev,
          requiredPermissionGranted: true,
        }))
        setEnableRetry(true)
      }
    }
    checkPermissionsAsync()
  }, [refresh, setNavigationState])

  const isInternetAvailable = useConnectivity()

  if (isUnderMaintenance) {
    return (
      <ErrorScreen
        showXAccount
        title={translate('maintenanceTitle')}
        text={translate('maintenanceText')}
      />
    )
  }

  if (!isInternetAvailable && !station) {
    return (
      <ErrorScreen
        title={translate('errorTitle')}
        text={translate('offlineText')}
      />
    )
  }

  if (errorFromState) {
    return (
      <ErrorScreen
        retryEnabled={enableRetry}
        showXAccount
        title={translate('errorTitle')}
        text={translate('apiErrorText')}
        onRetryPress={refresh}
      />
    )
  }

  return <Permitted>{children}</Permitted>
}

export default React.memo(Layout)
