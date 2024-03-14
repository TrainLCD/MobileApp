import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigation } from '@react-navigation/native'
import * as Location from 'expo-location'
import * as TaskManager from 'expo-task-manager'
import React, { useCallback, useEffect } from 'react'
import { Alert, ScrollView, StyleSheet, View } from 'react-native'
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import { Line } from '../../gen/proto/stationapi_pb'
import Button from '../components/Button'
import ErrorScreen from '../components/ErrorScreen'
import FAB from '../components/FAB'
import Heading from '../components/Heading'
import Loading from '../components/Loading'
import {
  ASYNC_STORAGE_KEYS,
  LOCATION_TASK_NAME,
  parenthesisRegexp,
} from '../constants'
import useConnectivity from '../hooks/useConnectivity'
import { useCurrentPosition } from '../hooks/useCurrentPosition'
import { useFetchNearbyStation } from '../hooks/useFetchNearbyStation'
import useGetLineMark from '../hooks/useGetLineMark'
import lineState from '../store/atoms/line'
import locationState from '../store/atoms/location'
import navigationState from '../store/atoms/navigation'
import { currentStationSelector } from '../store/selectors/currentStation'
import { isJapanese, translate } from '../translation'
import { isDevApp } from '../utils/isDevApp'
import isTablet from '../utils/isTablet'

const styles = StyleSheet.create({
  rootPadding: {
    padding: 24,
  },
  marginTop: {
    marginTop: 24,
  },
  buttons: {
    marginTop: 12,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    alignItems: 'center',
    width: '90%',
    alignSelf: 'center',
  },
  button: {
    marginHorizontal: isTablet ? 12 : 8,
    marginBottom: isTablet ? 24 : 12,
  },
})

const SelectLineScreen: React.FC = () => {
  const [location, setLocationState] = useRecoilState(locationState)
  const setNavigation = useSetRecoilState(navigationState)
  const setLineState = useSetRecoilState(lineState)
  const fetchStationFunc = useFetchNearbyStation()
  const isInternetAvailable = useConnectivity()
  const {
    fetchCurrentPosition,
    loading: locationLoading,
    error: fetchLocationError,
  } = useCurrentPosition()
  const station = useRecoilValue(currentStationSelector({}))

  useEffect(() => {
    const init = async () => {
      if (station) {
        return
      }

      const pos = await fetchCurrentPosition()
      if (!pos) {
        return
      }
      setLocationState(pos)
      await fetchStationFunc(pos)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const f = async (): Promise<void> => {
      const firstLaunchPassed = await AsyncStorage.getItem(
        ASYNC_STORAGE_KEYS.FIRST_LAUNCH_PASSED
      )
      if (firstLaunchPassed === null) {
        Alert.alert(translate('notice'), translate('firstAlertText'), [
          {
            text: 'OK',
            onPress: (): void => {
              AsyncStorage.setItem(
                ASYNC_STORAGE_KEYS.FIRST_LAUNCH_PASSED,
                'true'
              )
            },
          },
        ])
      }
    }
    f()
  }, [])

  useEffect(() => {
    const stopLocationUpdatesAsync = async () => {
      const isStarted = await Location.hasStartedLocationUpdatesAsync(
        LOCATION_TASK_NAME
      )
      if (isStarted) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME)
        await TaskManager.unregisterTaskAsync(LOCATION_TASK_NAME)
      }
    }
    stopLocationUpdatesAsync()
  }, [])

  const navigation = useNavigation()

  const handleLineSelected = useCallback(
    (line: Line): void => {
      setNavigation((prev) => ({
        ...prev,
        trainType: line.station?.trainType ?? null,
        leftStations: [],
        stationForHeader: null,
      }))
      setLineState((prev) => ({
        ...prev,
        selectedLine: line,
      }))
      navigation.navigate('SelectBound')
    },
    [navigation, setLineState, setNavigation]
  )

  const getLineMarkFunc = useGetLineMark()

  const getButtonText = useCallback(
    (line: Line) => {
      const lineMark = station && getLineMarkFunc({ line })
      const lineName = line.nameShort.replace(parenthesisRegexp, '')
      const lineNameR = line.nameRoman?.replace(parenthesisRegexp, '') ?? ''
      if (lineMark?.extraSign) {
        return `[${lineMark.sign}/${lineMark.subSign}/${lineMark.extraSign}] ${
          isJapanese ? lineName : lineNameR
        }`
      }
      if (lineMark?.subSign) {
        return `[${lineMark.sign}/${lineMark.subSign}] ${
          isJapanese ? lineName : lineNameR
        }`
      }
      if (lineMark?.sign) {
        return `[${lineMark.sign}] ${isJapanese ? lineName : lineNameR}`
      }
      return isJapanese ? lineName : lineNameR
    },
    [getLineMarkFunc, station]
  )

  const renderLineButton: React.FC<Line> = useCallback(
    (line: Line) => {
      const buttonOnPress = (): void => handleLineSelected(line)
      const buttonText = getButtonText(line)

      return (
        <Button
          color={line.color ?? '#000'}
          key={line.id}
          disabled={!isInternetAvailable}
          style={styles.button}
          onPress={buttonOnPress}
        >
          {buttonText}
        </Button>
      )
    },
    [getButtonText, handleLineSelected, isInternetAvailable]
  )

  const handleUpdateStation = useCallback(async () => {
    const pos = await fetchCurrentPosition()
    if (!pos) {
      return
    }
    setLocationState(pos)
    setNavigation((prev) => ({
      ...prev,
      stationForHeader: null,
      stationFromCoordinates: null,
    }))

    await fetchStationFunc(pos)
  }, [fetchCurrentPosition, fetchStationFunc, setLocationState, setNavigation])

  const navigateToSettingsScreen = useCallback(() => {
    navigation.navigate('AppSettings')
  }, [navigation])

  const navigateToFakeStationSettingsScreen = useCallback(() => {
    navigation.navigate('FakeStation')
  }, [navigation])

  const navigateToSavedRoutesScreen = useCallback(() => {
    navigation.navigate('SavedRoutes')
  }, [navigation])

  if (fetchLocationError && !station) {
    return (
      <ErrorScreen
        showSearchStation
        title={translate('errorTitle')}
        text={translate('couldNotGetLocation')}
        onRetryPress={handleUpdateStation}
      />
    )
  }

  // NOTE: 駅検索ができるボタンが表示されるので、!stationがないと一生loadingになる
  if (!location && !station) {
    return (
      <Loading
        message={translate('loadingLocation')}
        linkType="searchStation"
      />
    )
  }

  if (!station) {
    return <Loading message={translate('loadingAPI')} linkType="serverStatus" />
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.rootPadding}>
        <Heading>{translate('selectLineTitle')}</Heading>

        <View style={styles.buttons}>
          {station.lines.map((l) => renderLineButton(l))}
        </View>

        <Heading style={styles.marginTop}>{translate('settings')}</Heading>
        <View style={styles.buttons}>
          {isInternetAvailable ? (
            <Button
              style={styles.button}
              onPress={navigateToFakeStationSettingsScreen}
            >
              {translate('searchFirstStationTitle')}
            </Button>
          ) : null}
          {isInternetAvailable && isDevApp && (
            <Button style={styles.button} onPress={navigateToSavedRoutesScreen}>
              {translate('savedRoutes')}
            </Button>
          )}
          <Button style={styles.button} onPress={navigateToSettingsScreen}>
            {translate('settings')}
          </Button>
        </View>
      </ScrollView>
      <FAB
        disabled={!isInternetAvailable || locationLoading}
        icon="refresh"
        onPress={handleUpdateStation}
      />
    </>
  )
}

export default React.memo(SelectLineScreen)
