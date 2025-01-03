import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigation } from '@react-navigation/native'
import React, { useCallback } from 'react'
import { Alert, ScrollView, StyleSheet, Switch, View } from 'react-native'
import { useRecoilState } from 'recoil'
import Button from '../../components/Button'
import FAB from '../../components/FAB'
import Heading from '../../components/Heading'
import LEDThemeSwitch from '../../components/LEDThemeSwitch'
import Typography from '../../components/Typography'
import { ASYNC_STORAGE_KEYS } from '../../constants'
import { useThemeStore } from '../../hooks/useThemeStore'
import { APP_THEME } from '../../models/Theme'
import speechState from '../../store/atoms/speech'
import { translate } from '../../translation'
import { isDevApp } from '../../utils/isDevApp'
import { RFValue } from '../../utils/rfValue'

const styles = StyleSheet.create({
  rootPadding: {
    paddingTop: 24,
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
    marginTop: 12,
  },
  settingItem: {
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  settingItems: {
    width: '50%',
    alignSelf: 'center',
    alignItems: 'flex-start',
    marginTop: 12,
    marginBottom: 8,
  },
})

const AppSettingsScreen: React.FC = () => {
  const [
    { enabled: speechEnabled, losslessEnabled, backgroundEnabled },
    setSpeechState,
  ] = useRecoilState(speechState)
  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED)

  const navigation = useNavigation()

  const onPressBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack()
    }
  }, [navigation])

  const onSpeechEnabledValueChange = useCallback(
    async (flag: boolean) => {
      const ttsNoticeConfirmed = await AsyncStorage.getItem(
        ASYNC_STORAGE_KEYS.QA_TTS_NOTICE
      )
      if (flag && ttsNoticeConfirmed === null) {
        Alert.alert(translate('notice'), translate('ttsAlertText'), [
          {
            text: translate('doNotShowAgain'),
            style: 'cancel',
            onPress: async (): Promise<void> => {
              await AsyncStorage.setItem(
                ASYNC_STORAGE_KEYS.QA_TTS_NOTICE,
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
        ASYNC_STORAGE_KEYS.SPEECH_ENABLED,
        flag ? 'true' : 'false'
      )
      setSpeechState((prev) => ({
        ...prev,
        enabled: flag,
      }))
    },
    [setSpeechState]
  )

  const onLosslessAudioEnabledValueChange = useCallback(
    async (flag: boolean) => {
      await AsyncStorage.setItem(
        ASYNC_STORAGE_KEYS.QA_LOSSLESS_ENABLED,
        flag ? 'true' : 'false'
      )
      setSpeechState((prev) => ({
        ...prev,
        losslessEnabled: flag,
      }))
    },
    [setSpeechState]
  )
  const onBackgroundAudioEnabledValueChange = useCallback(
    async (flag: boolean) => {
      await AsyncStorage.setItem(
        ASYNC_STORAGE_KEYS.QA_BG_TTS_ENABLED,
        flag ? 'true' : 'false'
      )
      setSpeechState((prev) => ({
        ...prev,
        backgroundEnabled: flag,
      }))
    },
    [setSpeechState]
  )

  const toThemeSettings = () => navigation.navigate('ThemeSettings')
  const toEnabledLanguagesSettings = () =>
    navigation.navigate('EnabledLanguagesSettings')

  const toTuning = () => navigation.navigate('TuningSettings')

  return (
    <>
      <ScrollView style={styles.rootPadding}>
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
          {isDevApp && speechEnabled ? (
            <>
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
                    value={backgroundEnabled}
                    onValueChange={onBackgroundAudioEnabledValueChange}
                  />
                ) : (
                  <Switch
                    style={{ marginRight: 8 }}
                    value={backgroundEnabled}
                    onValueChange={onBackgroundAudioEnabledValueChange}
                  />
                )}
                <Typography style={styles.settingsItemHeading}>
                  {translate('autoAnnounceBackgroundTitle')}
                </Typography>
              </View>
            </>
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

          {isDevApp ? (
            <View style={styles.settingItem}>
              <Button onPress={toTuning}>{translate('tuning')}</Button>
            </View>
          ) : null}
        </View>
      </ScrollView>
      <FAB onPress={onPressBack} icon="close" />
    </>
  )
}

export default React.memo(AppSettingsScreen)
