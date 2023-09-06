import { connectActionSheet } from '@expo/react-native-action-sheet'
import { useNavigation } from '@react-navigation/native'
import * as Location from 'expo-location'
import React, { useCallback, useEffect, useState } from 'react'
import { Alert } from 'react-native'
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
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
  const setNavigation = useSetRecoilState(navigationState)
  const setLocation = useSetRecoilState(locationState)
  const { station } = useRecoilValue(stationState)
  const [{ requiredPermissionGranted }, setNavigationState] =
    useRecoilState(navigationState)
  const [fetchLocationError] = useDispatchLocation()
  const [locationErrorDismissed, setLocationErrorDismissed] = useState(false)
  const { navigate } = useNavigation()
  const [fetchStationFunc, fetchStationLoading, fetchStationError] =
    useFetchNearbyStation()
  useDeepLink()

  useEffect(() => {
    const f = async (): Promise<void> => {
      const { status } = await Location.getForegroundPermissionsAsync()
      const granted = status === Location.PermissionStatus.GRANTED
      setNavigation((prev) => ({
        ...prev,
        requiredPermissionGranted: granted,
      }))
    }
    f()
  }, [setNavigation])

  const refresh = useCallback(async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })
      setLocation((prev) => ({
        ...prev,
        location,
      }))
      await fetchStationFunc(location)
      setLocationErrorDismissed(true)
    } catch (err) {
      Alert.alert(translate('errorTitle'), translate('fetchLocationFailed'), [
        { text: 'OK' },
      ])
    }
  }, [fetchStationFunc, setLocation])

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

  // 位置情報なしで使う時はif内を通らない
  if (requiredPermissionGranted) {
    if (fetchStationLoading) {
      return <Loading />
    }

    if (fetchStationError) {
      return (
        <ErrorScreen
          title={translate('errorTitle')}
          text={translate('apiErrorText')}
          onRetryPress={refresh}
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
  }

  return <Permitted>{children}</Permitted>
}

export default connectActionSheet(React.memo(Layout))
