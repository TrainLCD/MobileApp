import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigation } from '@react-navigation/native'
import React, { useCallback } from 'react'
import { Alert, ScrollView, StyleSheet, Switch, View } from 'react-native'
import { RFValue } from 'react-native-responsive-fontsize'
import { useRecoilState, useRecoilValue } from 'recoil'
import Button from '../../components/Button'
import FAB from '../../components/FAB'
import Heading from '../../components/Heading'
import LEDThemeSwitch from '../../components/LEDThemeSwitch'
import Typography from '../../components/Typography'
import { ASYNC_STORAGE_KEYS } from '../../constants/asyncStorageKeys'
import { useIsLEDTheme } from '../../hooks/useIsLEDTheme'
import devState from '../../store/atoms/dev'
import speechState from '../../store/atoms/speech'
import { translate } from '../../translation'

const styles = StyleSheet.create({
  rootPadding: {
    padding: 24,
  },
  settingsItemHeading: {
    fontSize: RFValue(14),
    fontWeight: 'bold',
    textAlign: 'center',
  },
  settingItemList: {
    justifyContent: 'center',
    flexWrap: 'wrap',
    flexDirection: 'row',
    marginTop: 24,
  },
  settingItem: {
    justifyContent: 'center',
    alignItems: 'center',
    margin: 8,
  },
  settingItems: {
    width: '50%',
    alignSelf: 'center',
    alignItems: 'flex-start',
  },
})

const AppSettingsScreen: React.FC = () => {
  const [{ enabled: speechEnabled, losslessEnabled }, setSpeech] =
    useRecoilState(speechState)
  const { devMode } = useRecoilValue(devState)

  const isLEDTheme = useIsLEDTheme()

  const onSpeechEnabledValueChange = useCallback(
    async (flag: boolean) => {
      const ttsNoticeConfirmed = await AsyncStorage.getItem(
        ASYNC_STORAGE_KEYS.TTS_NOTICE
      )
      if (flag && ttsNoticeConfirmed === null) {
        Alert.alert(translate('notice'), translate('ttsAlertText'), [
          {
            text: translate('dontShowAgain'),
            style: 'cancel',
            onPress: async (): Promise<void> => {
              await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.TTS_NOTICE, 'true')
            },
          },
          {
            text: 'OK',
          },
        ])
      }

      await AsyncStorage.setItem(
        ASYNC_STORAGE_KEYS.SPEECH_ENABLED,
        flag ? 'true' : 'false'
      )
      setSpeech((prev) => ({
        ...prev,
        enabled: flag,
      }))
    },
    [setSpeech]
  )

  const onLosslessAudioEnabledValueChange = useCallback(
    async (flag: boolean) => {
      const losslessNoticeConfirmed = await AsyncStorage.getItem(
        ASYNC_STORAGE_KEYS.LOSSLESS_NOTICE
      )
      if (flag && losslessNoticeConfirmed === null) {
        Alert.alert(translate('warning'), translate('losslessAlertText'), [
          {
            text: translate('dontShowAgain'),
            style: 'cancel',
            onPress: async (): Promise<void> => {
              await AsyncStorage.setItem(
                ASYNC_STORAGE_KEYS.LOSSLESS_NOTICE,
                'true'
              )
            },
          },
          {
            text: 'OK',
          },
        ])
      }

      await AsyncStorage.setItem(
        ASYNC_STORAGE_KEYS.LOSSLESS_ENABLED,
        flag ? 'true' : 'false'
      )
      setSpeech((prev) => ({
        ...prev,
        losslessEnabled: flag,
      }))
    },
    [setSpeech]
  )

  const navigation = useNavigation()

  const onPressBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack()
    }
  }, [navigation])
  const toThemeSettings = () => navigation.navigate('ThemeSettings')
  const toEnabledLanguagesSettings = () =>
    navigation.navigate('EnabledLanguagesSettings')

  const toTuning = () => navigation.navigate('TuningSettings')

  return (
    <>
      <ScrollView contentContainerStyle={styles.rootPadding}>
        <Heading>{translate('settings')}</Heading>

        <View style={styles.settingItems}>
          <View
            style={[
              styles.settingItem,
              {
                flexDirection: 'row',
              },
            ]}
          >
            {isLEDTheme ? (
              <LEDThemeSwitch
                style={{ marginRight: 8 }}
                value={speechEnabled}
                onValueChange={onSpeechEnabledValueChange}
              />
            ) : (
              <Switch
                style={{ marginRight: 8 }}
                value={speechEnabled}
                onValueChange={onSpeechEnabledValueChange}
                ios_backgroundColor={'#fff'}
              />
            )}

            <Typography style={styles.settingsItemHeading}>
              {translate('autoAnnounceItemTitle')}
            </Typography>
          </View>

          {speechEnabled ? (
            <View
              style={[
                styles.settingItem,
                {
                  flexDirection: 'row',
                  marginTop: 8,
                },
              ]}
            >
              {isLEDTheme ? (
                <LEDThemeSwitch
                  style={{ marginRight: 8 }}
                  value={losslessEnabled}
                  onValueChange={onLosslessAudioEnabledValueChange}
                />
              ) : (
                <Switch
                  style={{ marginRight: 8 }}
                  value={losslessEnabled}
                  onValueChange={onLosslessAudioEnabledValueChange}
                />
              )}
              <Typography style={styles.settingsItemHeading}>
                {translate('autoAnnounceLosslessTitle')}
              </Typography>
            </View>
          ) : null}
        </View>
        <View style={styles.settingItemList}>
          <View style={styles.settingItem}>
            <Button onPress={toThemeSettings}>
              {translate('selectThemeTitle')}
            </Button>
          </View>
          <View style={styles.settingItem}>
            <Button onPress={toEnabledLanguagesSettings}>
              {translate('selectLanguagesTitle')}
            </Button>
          </View>

          {devMode ? (
            <>
              <View style={styles.settingItem}>
                <Button onPress={toTuning}>{translate('tuning')}</Button>
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>
      <FAB onPress={onPressBack} icon="md-close" />
    </>
  )
}

export default AppSettingsScreen
