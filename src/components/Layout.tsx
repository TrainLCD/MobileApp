import { connectActionSheet } from '@expo/react-native-action-sheet'
import * as Location from 'expo-location'
import React, { useCallback, useEffect } from 'react'
import { Alert } from 'react-native'
import { useRecoilValue, useSetRecoilState } from 'recoil'
import useConnectivity from '../hooks/useConnectivity'
import useDeepLink from '../hooks/useDeepLink'
import useFetchNearbyStation from '../hooks/useFetchNearbyStation'
import locationState from '../store/atoms/location'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import { translate } from '../translation'
import ErrorScreen from './ErrorScreen'
import Permitted from './Permitted'

type Props = {
  children: React.ReactNode
}

const Layout: React.FC<Props> = ({ children }: Props) => {
  const setLocation = useSetRecoilState(locationState)
  const { station, fetchStationError: errorFromState } =
    useRecoilValue(stationState)
  const setNavigationState = useSetRecoilState(navigationState)
  const fetchNearbyStationFunc = useFetchNearbyStation()
  useDeepLink()

  const refresh = useCallback(async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })
      setLocation((prev) => ({
        ...prev,
        location,
      }))
      await fetchNearbyStationFunc(location)
    } catch (err) {
      Alert.alert(translate('errorTitle'), translate('fetchLocationFailed'), [
        { text: 'OK' },
      ])
    }
  }, [fetchNearbyStationFunc, setLocation])

  useEffect(() => {
    const checkPermissionsAsync = async () => {
      const { status } = await Location.getForegroundPermissionsAsync()
      if (status === Location.PermissionStatus.GRANTED) {
        setNavigationState((prev) => ({
          ...prev,
          requiredPermissionGranted: true,
        }))
      }
    }
    checkPermissionsAsync()
  }, [refresh, setNavigationState])

  const isInternetAvailable = useConnectivity()

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
        title={translate('errorTitle')}
        text={translate('apiErrorText')}
        onRetryPress={refresh}
      />
    )
  }

  return <Permitted>{children}</Permitted>
}

export default connectActionSheet(React.memo(Layout))
