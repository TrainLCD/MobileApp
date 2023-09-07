import { connectActionSheet } from '@expo/react-native-action-sheet'
import { useNavigation } from '@react-navigation/native'
import * as Location from 'expo-location'
import React, { useCallback, useEffect, useState } from 'react'
import { Alert } from 'react-native'
import { useRecoilValue, useSetRecoilState } from 'recoil'
import useConnectivity from '../hooks/useConnectivity'
import useDeepLink from '../hooks/useDeepLink'
import useDispatchLocation from '../hooks/useDispatchLocation'
import useFetchNearbyStation from '../hooks/useFetchNearbyStation'
import locationState from '../store/atoms/location'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import { translate } from '../translation'
import ErrorScreen from './ErrorScreen'
import Loading from './Loading'
import Permitted from './Permitted'

type Props = {
  children: React.ReactNode
}

const Layout: React.FC<Props> = ({ children }: Props) => {
  const setLocation = useSetRecoilState(locationState)
  const {
    station,
    fetchStationLoading: loadingFromState,
    fetchStationError: errorFromState,
  } = useRecoilValue(stationState)
  const setNavigationState = useSetRecoilState(navigationState)
  const [fetchLocationLoading, fetchLocationError] = useDispatchLocation()
  const [locationErrorDismissed, setLocationErrorDismissed] = useState(false)
  const { navigate } = useNavigation()
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
      setLocationErrorDismissed(true)
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
        await refresh()
      }
    }
    checkPermissionsAsync()
  }, [refresh, setNavigationState])

  const handleRecoverLocationError = () => {
    navigate('FakeStation')
    setLocationErrorDismissed(true)
  }

  const isInternetAvailable = useConnectivity()

  if (!isInternetAvailable && !station) {
    return (
      <ErrorScreen
        title={translate('errorTitle')}
        text={translate('offlineText')}
      />
    )
  }

  if (fetchLocationError && !locationErrorDismissed) {
    return (
      <ErrorScreen
        title={translate('errorTitle')}
        text={translate('couldNotGetLocation')}
        onRetryPress={refresh}
        onRecoverErrorPress={handleRecoverLocationError}
        recoverable
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

  if (loadingFromState || fetchLocationLoading) {
    return <Loading />
  }

  return <Permitted>{children}</Permitted>
}

export default connectActionSheet(React.memo(Layout))
