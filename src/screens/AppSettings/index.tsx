import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigation } from '@react-navigation/native'
import React, { useCallback } from 'react'
import { Alert, ScrollView, StyleSheet, Switch, View } from 'react-native'
import { RFValue } from 'react-native-responsive-fontsize'
import { useRecoilState, useRecoilValue } from 'recoil'
import Button from '../../components/Button'
import FAB from '../../components/FAB'
import Heading from '../../components/Heading'
import Typography from '../../components/Typography'
import { ASYNC_STORAGE_KEYS } from '../../constants/asyncStorageKeys'
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
    color: '#555',
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
    margin: 8,
  },
})

const AppSettingsScreen: React.FC = () => {
  const [{ enabled: speechEnabled }, setSpeech] = useRecoilState(speechState)
  const { devMode } = useRecoilValue(devState)

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
        <View
          style={[
            styles.settingItem,
            {
              flexDirection: 'row',
            },
          ]}
        >
          <Switch
            style={{ marginRight: 8 }}
            value={speechEnabled}
            onValueChange={onSpeechEnabledValueChange}
          />
          <Typography style={styles.settingsItemHeading}>
            {translate('autoAnnounceItemTitle')}
          </Typography>
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
