import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigation } from '@react-navigation/native'
import * as FileSystem from 'expo-file-system'
import * as Haptics from 'expo-haptics'
import { addScreenshotListener } from 'expo-screen-capture'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Dimensions, StyleSheet, View } from 'react-native'
import { LongPressGestureHandler, State } from 'react-native-gesture-handler'
import Share from 'react-native-share'
import ViewShot from 'react-native-view-shot'
import { useRecoilValue, useSetRecoilState } from 'recoil'
import {
  ALL_AVAILABLE_LANGUAGES,
  ASYNC_STORAGE_KEYS,
  LONG_PRESS_DURATION,
  parenthesisRegexp,
} from '../constants'
import useAndroidWearable from '../hooks/useAndroidWearable'
import useAppleWatch from '../hooks/useAppleWatch'
import useCachedInitAnonymousUser from '../hooks/useCachedAnonymousUser'
import useCheckStoreVersion from '../hooks/useCheckStoreVersion'
import { useCurrentLine } from '../hooks/useCurrentLine'
import useListenMessaging from '../hooks/useListenMessaging'
import useReport from '../hooks/useReport'
import useReportEligibility from '../hooks/useReportEligibility'
import { useResetMainState } from '../hooks/useResetMainState'
import { useThemeStore } from '../hooks/useThemeStore'
import { useUpdateLiveActivities } from '../hooks/useUpdateLiveActivities'
import { useWarningInfo } from '../hooks/useWarningInfo'
import { AppTheme } from '../models/Theme'
import navigationState from '../store/atoms/navigation'
import speechState from '../store/atoms/speech'
import stationState from '../store/atoms/station'
import { isJapanese, translate } from '../translation'
import { isDevApp } from '../utils/isDevApp'
import { BottomSheet } from './BottomSheet'
import DevOverlay from './DevOverlay'
import Header from './Header'
import NewReportModal from './NewReportModal'
import WarningPanel from './WarningPanel'

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
    height: Dimensions.get('window').height,
  },
})

type Props = {
  children: React.ReactNode
}

const PermittedLayout: React.FC<Props> = ({ children }: Props) => {
  const { selectedBound } = useRecoilValue(stationState)
  const setNavigation = useSetRecoilState(navigationState)
  const setSpeech = useSetRecoilState(speechState)
  const [reportModalShow, setReportModalShow] = useState(false)
  const [sendingReport, setSendingReport] = useState(false)
  const [reportDescription, setReportDescription] = useState('')
  const [screenShotBase64, setScreenShotBase64] = useState('')
  const [isBottomSheetShow, setIsBottomSheetShow] = useState(false)

  useCheckStoreVersion()
  useAppleWatch()
  useAndroidWearable()
  useUpdateLiveActivities()
  useListenMessaging()

  const user = useCachedInitAnonymousUser()
  const currentLine = useCurrentLine()
  const navigation = useNavigation()
  const { sendReport, descriptionLowerLimit } = useReport(user)
  const reportEligibility = useReportEligibility()
  const resetMainState = useResetMainState()
  const { warningInfo, clearWarningInfo } = useWarningInfo()

  const viewShotRef = useRef<ViewShot>(null)

  const handleReport = useCallback(async () => {
    if (!viewShotRef.current?.capture) {
      return
    }

    setIsBottomSheetShow(false)

    try {
      switch (reportEligibility) {
        case 'banned':
          Alert.alert(translate('errorTitle'), translate('feedbackBanned'))
          return
        case 'limitExceeded':
          Alert.alert(
            translate('annoucementTitle'),
            translate('feedbackSendLimitExceeded')
          )
          return
        default:
          break
      }

      const uri = await viewShotRef.current.capture()
      setScreenShotBase64(
        await FileSystem.readAsStringAsync(uri, { encoding: 'base64' })
      )

      setReportModalShow(true)
    } catch (err) {
      console.error(err)
      Alert.alert(translate('errorTitle'), translate('reportError'))
    }
  }, [reportEligibility])

  const handleShare = useCallback(async () => {
    if (!viewShotRef || !currentLine) {
      return
    }

    setIsBottomSheetShow(false)

    try {
      if (!viewShotRef.current?.capture || !currentLine) {
        return
      }

      const uri = await viewShotRef.current.capture()
      const res = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      })
      const urlString = `data:image/jpeg;base64,${res}`
      const message = isJapanese
        ? `${currentLine.nameShort.replace(
            parenthesisRegexp,
            ''
          )}で移動中です！ #TrainLCD https://trainlcd.app`
        : `I'm riding ${currentLine.nameRoman?.replace(
            parenthesisRegexp,
            ''
          )} with #TrainLCD https://trainlcd.app`
      const options = {
        title: 'TrainLCD',
        message,
        url: urlString,
        type: 'image/png',
      }
      await Share.open(options)
    } catch (err) {
      if ((err as { message: string }).message !== 'User did not share') {
        Alert.alert(`${translate('couldntShare')} ${err}`)
      }
    }
  }, [currentLine])

  const onLongPress = useCallback(
    async ({
      nativeEvent,
    }: {
      nativeEvent: {
        state: State
      }
    }): Promise<void> => {
      if (!selectedBound || nativeEvent.state !== State.ACTIVE) {
        return
      }

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

      setIsBottomSheetShow(true)
    },
    [selectedBound]
  )

  const handleBackPress = useCallback(() => {
    setIsBottomSheetShow(false)
    resetMainState()
    navigation.navigate('SelectBound')
  }, [navigation, resetMainState])

  const handleBottomSheetDismiss = useCallback(
    () => setIsBottomSheetShow(false),
    []
  )

  useEffect(() => {
    const loadSettingsAsync = async () => {
      const prevThemeKey = (await AsyncStorage.getItem(
        ASYNC_STORAGE_KEYS.PREVIOUS_THEME
      )) as AppTheme | null

      if (prevThemeKey) {
        useThemeStore.setState(prevThemeKey)
      }
      const enabledLanguagesStr = await AsyncStorage.getItem(
        ASYNC_STORAGE_KEYS.ENABLED_LANGUAGES
      )
      if (enabledLanguagesStr) {
        setNavigation((prev) => ({
          ...prev,
          enabledLanguages:
            JSON.parse(enabledLanguagesStr) || ALL_AVAILABLE_LANGUAGES,
        }))
      }
      const speechEnabledStr = await AsyncStorage.getItem(
        ASYNC_STORAGE_KEYS.SPEECH_ENABLED
      )
      setSpeech((prev) => ({
        ...prev,
        enabled: speechEnabledStr === 'true',
      }))
      const losslessEnabledStr = await AsyncStorage.getItem(
        ASYNC_STORAGE_KEYS.QA_LOSSLESS_ENABLED // プレミアム音声はまだリリースしないのでQA_のままで問題ない
      )
      setSpeech((prev) => ({
        ...prev,
        losslessEnabled: losslessEnabledStr === 'true',
      }))
      const bgTTSEnabledStr = await AsyncStorage.getItem(
        ASYNC_STORAGE_KEYS.QA_BG_TTS_ENABLED // プレミアム音声はまだリリースしないのでQA_のままで問題ない
      )
      setSpeech((prev) => ({
        ...prev,
        backgroundEnabled: bgTTSEnabledStr === 'true',
      }))
    }

    loadSettingsAsync()
  }, [setNavigation, setSpeech])

  useEffect(() => {
    const { remove } = addScreenshotListener(() => {
      if (selectedBound) {
        clearWarningInfo()
      }
    })

    return remove
  }, [clearWarningInfo, selectedBound])

  const NullableWarningPanel: React.FC = useCallback(
    () =>
      warningInfo ? (
        <WarningPanel
          onPress={clearWarningInfo}
          text={warningInfo.text}
          warningLevel={warningInfo.level}
        />
      ) : null,
    [clearWarningInfo, warningInfo]
  )

  const handleNewReportModalClose = useCallback(() => {
    setReportDescription('')
    setScreenShotBase64('')
    setReportModalShow(false)
  }, [])

  const handleReportSend = useCallback(() => {
    if (reportDescription.length < descriptionLowerLimit) {
      Alert.alert(
        translate('errorTitle'),
        translate('feedbackCharactersCountNotReached', {
          lowerLimit: descriptionLowerLimit,
        })
      )
      return
    }

    Alert.alert(translate('annoucementTitle'), translate('reportConfirmText'), [
      {
        text: translate('agree'),
        style: 'destructive',
        onPress: async () => {
          try {
            setSendingReport(true)
            await sendReport({
              reportType: 'feedback',
              description: reportDescription.trim(),
              screenShotBase64,
            })
            setSendingReport(false)
            Alert.alert(
              translate('annoucementTitle'),
              translate('reportSuccessText')
            )
            handleNewReportModalClose()
          } catch (err) {
            console.error(err)
            setSendingReport(false)
            Alert.alert(translate('errorTitle'), translate('reportError'))
          }
        },
      },
      {
        text: translate('disagree'),
        style: 'cancel',
      },
    ])
  }, [
    descriptionLowerLimit,
    handleNewReportModalClose,
    reportDescription,
    screenShotBase64,
    sendReport,
  ])

  return (
    <ViewShot ref={viewShotRef} options={{ format: 'png' }}>
      <LongPressGestureHandler
        onHandlerStateChange={onLongPress}
        minDurationMs={LONG_PRESS_DURATION}
      >
        <View style={styles.root}>
          {isDevApp && <DevOverlay />}
          <Header />
          {children}
          <NullableWarningPanel />

          <BottomSheet
            open={isBottomSheetShow}
            onDismiss={handleBottomSheetDismiss}
            onBackPress={handleBackPress}
            onSharePress={handleShare}
            onReportPress={handleReport}
          />
        </View>
      </LongPressGestureHandler>
      <NewReportModal
        visible={reportModalShow}
        sending={sendingReport}
        onClose={handleNewReportModalClose}
        description={reportDescription}
        onDescriptionChange={setReportDescription}
        onSubmit={handleReportSend}
        descriptionLowerLimit={descriptionLowerLimit}
      />
    </ViewShot>
  )
}

export default React.memo(PermittedLayout)
