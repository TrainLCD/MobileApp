import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  useBackgroundPermissions,
  useForegroundPermissions,
} from 'expo-location'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppState } from 'react-native'
import { useRecoilValue } from 'recoil'
import { ASYNC_STORAGE_KEYS } from '../constants'
import stationState from '../store/atoms/station'
import { translate } from '../translation'
import { useApplicationFlagStore } from './useApplicationFlagStore'
import { useBadAccuracy } from './useBadAccuracy'
import useConnectivity from './useConnectivity'

const WARNING_PANEL_LEVEL = {
  URGENT: 'URGENT',
  WARNING: 'WARNING',
  INFO: 'INFO',
} as const

export const useWarningInfo = () => {
  const [warningDismissed, setWarningDismissed] = useState(false)
  const [longPressNoticeDismissed, setLongPressNoticeDismissed] = useState(true)
  const [
    isAlwaysPermissionNotGrantedDismissed,
    setIsAlwaysPermissionNotGrantedDismissed,
  ] = useState(true)
  const [screenshotTaken, setScreenshotTaken] = useState(false)
  const [bgPermGrantedManually, setBGPermGrantedManually] = useState(false)

  const { selectedBound } = useRecoilValue(stationState)

  const badAccuracy = useBadAccuracy()
  const [fgPermStatus] = useForegroundPermissions()
  const [bgPermStatus, , getBGPermStatus] = useBackgroundPermissions()

  const autoModeEnabled = useApplicationFlagStore(
    (state) => state.autoModeEnabled
  )
  const isInternetAvailable = useConnectivity()

  useEffect(() => {
    const { remove } = AppState.addEventListener('change', async (state) => {
      if (state === 'active') {
        const { granted } = await getBGPermStatus()
        setBGPermGrantedManually(granted)
      }
    })
    return remove
  }, [getBGPermStatus])

  useEffect(() => {
    if (autoModeEnabled) {
      setWarningDismissed(false)
    }
  }, [autoModeEnabled])

  useEffect(() => {
    if (!isInternetAvailable) {
      setWarningDismissed(false)
    }
  }, [isInternetAvailable])

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-extra-semi
    ;(async () => {
      setLongPressNoticeDismissed(
        (await AsyncStorage.getItem(
          ASYNC_STORAGE_KEYS.LONG_PRESS_NOTICE_DISMISSED
        )) === 'true'
      )

      setIsAlwaysPermissionNotGrantedDismissed(
        (await AsyncStorage.getItem(
          ASYNC_STORAGE_KEYS.ALWAYS_PERMISSION_NOT_GRANTED_WARNING_DISMISSED
        )) === 'true'
      )
    })()
  }, [])

  const warningInfo = useMemo(() => {
    if (warningDismissed) {
      return null
    }

    // NOTE: フォアグラウンドも許可しない設定の場合はそもそもオートモード前提で使われていると思うので警告は不要
    if (fgPermStatus?.granted) {
      if (
        !bgPermStatus?.granted &&
        !isAlwaysPermissionNotGrantedDismissed &&
        !bgPermGrantedManually
      ) {
        return {
          level: WARNING_PANEL_LEVEL.WARNING,
          text: translate('alwaysPermissionNotGrantedText'),
        }
      }
    }

    if (!longPressNoticeDismissed && selectedBound) {
      return {
        level: WARNING_PANEL_LEVEL.INFO,
        text: translate('longPressNotice'),
      }
    }

    if (autoModeEnabled) {
      return {
        level: WARNING_PANEL_LEVEL.INFO,
        text: translate('autoModeInProgress'),
      }
    }

    if (!isInternetAvailable && selectedBound) {
      return {
        level: WARNING_PANEL_LEVEL.WARNING,
        text: translate('offlineWarningText'),
      }
    }

    if (badAccuracy) {
      return {
        level: WARNING_PANEL_LEVEL.URGENT,
        text: translate('badAccuracy'),
      }
    }

    if (screenshotTaken) {
      return {
        level: WARNING_PANEL_LEVEL.INFO,
        text: translate('shareNotice'),
      }
    }
    return null
  }, [
    autoModeEnabled,
    badAccuracy,
    bgPermGrantedManually,
    bgPermStatus?.granted,
    fgPermStatus?.granted,
    isAlwaysPermissionNotGrantedDismissed,
    isInternetAvailable,
    longPressNoticeDismissed,
    screenshotTaken,
    selectedBound,
    warningDismissed,
  ])

  const clearWarningInfo = useCallback(() => {
    setWarningDismissed(true)
    setScreenshotTaken(false)

    if (!longPressNoticeDismissed) {
      const saveFlagAsync = async () => {
        await AsyncStorage.setItem(
          ASYNC_STORAGE_KEYS.LONG_PRESS_NOTICE_DISMISSED,
          'true'
        )
      }
      saveFlagAsync()
    }
  }, [longPressNoticeDismissed])

  return { warningInfo, clearWarningInfo }
}
