import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigation } from '@react-navigation/native'
import { useKeepAwake } from 'expo-keep-awake'
import * as Linking from 'expo-linking'
import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  Alert,
  BackHandler,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native'
import { useRecoilState, useRecoilValue } from 'recoil'
import { LineType, StopCondition } from '../../gen/proto/stationapi_pb'
import LineBoard from '../components/LineBoard'
import Transfers from '../components/Transfers'
import TransfersYamanote from '../components/TransfersYamanote'
import TypeChangeNotify from '../components/TypeChangeNotify'
import { ASYNC_STORAGE_KEYS } from '../constants'
import useAutoMode from '../hooks/useAutoMode'
import { useCurrentLine } from '../hooks/useCurrentLine'
import { useCurrentStation } from '../hooks/useCurrentStation'
import { useLoopLine } from '../hooks/useLoopLine'
import { useNextStation } from '../hooks/useNextStation'
import useRefreshLeftStations from '../hooks/useRefreshLeftStations'
import useRefreshStation from '../hooks/useRefreshStation'
import { useResetMainState } from '../hooks/useResetMainState'
import useShouldHideTypeChange from '../hooks/useShouldHideTypeChange'
import { useStartBackgroundLocationUpdates } from '../hooks/useStartBackgroundLocationUpdates'
import { useThemeStore } from '../hooks/useThemeStore'
import useTransferLines from '../hooks/useTransferLines'
import useTransitionHeaderState from '../hooks/useTransitionHeaderState'
import { useTTS } from '../hooks/useTTS'
import { useTypeWillChange } from '../hooks/useTypeWillChange'
import useUpdateBottomState from '../hooks/useUpdateBottomState'
import { APP_THEME } from '../models/Theme'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import { translate } from '../translation'
import getCurrentStationIndex from '../utils/currentStationIndex'
import { getIsHoliday } from '../utils/isHoliday'
import getIsPass from '../utils/isPass'

const { height: windowHeight } = Dimensions.get('window')

const styles = StyleSheet.create({
  touchable: {
    height: windowHeight - 128,
  },
})

const MainScreen: React.FC = () => {
  const theme = useThemeStore()
  const isLEDTheme = theme === APP_THEME.LED

  const { stations, selectedDirection, arrived } = useRecoilValue(stationState)
  const [{ leftStations, bottomState, autoModeEnabled }, setNavigation] =
    useRecoilState(navigationState)
  const currentLine = useCurrentLine()
  const currentStation = useCurrentStation()

  const nextStation = useNextStation()
  useAutoMode(autoModeEnabled)
  const { isYamanoteLine, isOsakaLoopLine, isMeijoLine } = useLoopLine()

  const currentStationRef = useRef(currentStation)
  const stationsRef = useRef(stations)

  const hasTerminus = useMemo((): boolean => {
    if (!currentLine || isYamanoteLine || isOsakaLoopLine || isMeijoLine) {
      return false
    }
    if (selectedDirection === 'INBOUND') {
      return leftStations
        .slice(0, 8)
        .some((ls) => ls.id === stations[stations.length - 1]?.id)
    }

    return leftStations
      .slice(0, 8)
      .some(
        (ls) => ls.id === stations.slice().reverse()[stations.length - 1]?.id
      )
  }, [
    currentLine,
    isYamanoteLine,
    isOsakaLoopLine,
    isMeijoLine,
    selectedDirection,
    leftStations,
    stations,
  ])

  const openFailedToOpenSettingsAlert = useCallback(
    () =>
      Alert.alert(translate('errorTitle'), translate('failedToOpenSettings'), [
        {
          text: 'OK',
        },
      ]),
    []
  )

  useEffect(() => {
    if (Platform.OS === 'android') {
      const f = async (): Promise<void> => {
        const firstOpenPassed = await AsyncStorage.getItem(
          ASYNC_STORAGE_KEYS.DOSE_CONFIRMED
        )
        if (firstOpenPassed === null) {
          Alert.alert(translate('notice'), translate('dozeAlertText'), [
            {
              text: translate('dontShowAgain'),
              style: 'cancel',
              onPress: async (): Promise<void> => {
                await AsyncStorage.setItem(
                  ASYNC_STORAGE_KEYS.DOSE_CONFIRMED,
                  'true'
                )
              },
            },
            {
              text: translate('settings'),
              onPress: async (): Promise<void> => {
                Linking.openSettings().catch(() => {
                  openFailedToOpenSettingsAlert()
                })
                await AsyncStorage.setItem(
                  ASYNC_STORAGE_KEYS.DOSE_CONFIRMED,
                  'true'
                )
              },
            },
            {
              text: 'OK',
              style: 'cancel',
            },
          ])
        }
      }
      f()
    }
  }, [openFailedToOpenSettingsAlert])
  const navigation = useNavigation()
  useTransitionHeaderState()
  useRefreshLeftStations()
  useRefreshStation()
  useKeepAwake()
  useStartBackgroundLocationUpdates()
  useResetMainState()
  useTTS()

  const { pause: pauseBottomTimer } = useUpdateBottomState()

  const transferStation = useMemo(
    () =>
      arrived && currentStation && !getIsPass(currentStation)
        ? currentStation
        : nextStation ?? null,
    [arrived, nextStation, currentStation]
  )

  const stationsFromCurrentStation = useMemo(() => {
    if (!selectedDirection) {
      return []
    }
    const currentStationIndex = getCurrentStationIndex(
      stationsRef.current,
      currentStationRef.current
    )
    return selectedDirection === 'INBOUND'
      ? stationsRef.current.slice(currentStationIndex)
      : stationsRef.current.slice(0, currentStationIndex + 1)
  }, [selectedDirection])

  useEffect(() => {
    if (
      stationsFromCurrentStation.some(
        (s) => s.line?.lineType === LineType.Subway
      )
    ) {
      Alert.alert(translate('subwayAlertTitle'), translate('subwayAlertText'), [
        { text: 'OK' },
      ])
    }
  }, [stationsFromCurrentStation])

  useEffect(() => {
    if (
      stationsFromCurrentStation.findIndex(
        (s) => s.stopCondition === StopCondition.Weekday
      ) !== -1 &&
      getIsHoliday()
    ) {
      Alert.alert(translate('notice'), translate('holidayNotice'))
    }
    if (
      stationsFromCurrentStation.findIndex(
        (s) => s.stopCondition === StopCondition.Holiday
      ) !== -1 &&
      !getIsHoliday()
    ) {
      Alert.alert(translate('notice'), translate('weekdayNotice'))
    }

    if (
      stationsFromCurrentStation.findIndex(
        (s) => s.stopCondition === StopCondition.Partial
      ) !== -1
    ) {
      Alert.alert(translate('notice'), translate('partiallyPassNotice'))
    }
  }, [stationsFromCurrentStation])

  const transferLines = useTransferLines()

  const toTransferState = useCallback((): void => {
    if (transferLines.length) {
      pauseBottomTimer()
      setNavigation((prev) => ({
        ...prev,
        bottomState: 'TRANSFER',
      }))
    }
  }, [pauseBottomTimer, setNavigation, transferLines.length])

  const toLineState = useCallback((): void => {
    pauseBottomTimer()
    setNavigation((prev) => ({
      ...prev,
      bottomState: 'LINE',
    }))
  }, [pauseBottomTimer, setNavigation])

  const isTypeWillChange = useTypeWillChange()
  const shouldHideTypeChange = useShouldHideTypeChange()

  const toTypeChangeState = useCallback(() => {
    if (!isTypeWillChange || shouldHideTypeChange) {
      pauseBottomTimer()
      setNavigation((prev) => ({
        ...prev,
        bottomState: 'LINE',
      }))
      return
    }
    setNavigation((prev) => ({
      ...prev,
      bottomState: 'TYPE_CHANGE',
    }))
  }, [isTypeWillChange, pauseBottomTimer, setNavigation, shouldHideTypeChange])

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        navigation.navigate('SelectBound')
        return true
      }
    )
    return subscription.remove
  }, [navigation])

  const marginForMetroThemeStyle = useMemo(
    () => ({
      marginTop: theme === APP_THEME.TOKYO_METRO ? -4 : 0, // メトロのヘッダーにある下部の影を相殺する
    }),
    [theme]
  )

  if (isLEDTheme) {
    return <LineBoard />
  }

  switch (bottomState) {
    case 'LINE':
      return (
        <View
          style={{
            flex: 1,
            height: windowHeight,
            ...marginForMetroThemeStyle,
          }}
        >
          <Pressable
            style={styles.touchable}
            onPress={transferLines.length ? toTransferState : toTypeChangeState}
          >
            <LineBoard hasTerminus={hasTerminus} />
          </Pressable>
        </View>
      )
    case 'TRANSFER':
      if (!transferStation) {
        return null
      }
      if (theme === APP_THEME.YAMANOTE || theme === APP_THEME.JO) {
        return (
          <TransfersYamanote
            onPress={isTypeWillChange ? toTypeChangeState : toLineState}
            station={transferStation}
          />
        )
      }

      return (
        <View style={[styles.touchable, marginForMetroThemeStyle]}>
          <Transfers
            theme={theme}
            onPress={isTypeWillChange ? toTypeChangeState : toLineState}
          />
        </View>
      )
    case 'TYPE_CHANGE':
      return (
        <View style={[styles.touchable, marginForMetroThemeStyle]}>
          <Pressable onPress={toLineState} style={styles.touchable}>
            <TypeChangeNotify />
          </Pressable>
        </View>
      )
    default:
      return <></>
  }
}

export default React.memo(MainScreen)
