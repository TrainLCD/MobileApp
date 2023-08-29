import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigation } from '@react-navigation/native'
import React, { useCallback } from 'react'
import { ScrollView, StyleSheet } from 'react-native'
import RNPickerSelect from 'react-native-picker-select'
import { RFValue } from 'react-native-responsive-fontsize'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRecoilState, useRecoilValue } from 'recoil'
import FAB from '../../components/FAB'
import Heading from '../../components/Heading'
import { ASYNC_STORAGE_KEYS } from '../../constants/asyncStorageKeys'
import { AppTheme } from '../../models/Theme'
import devState from '../../store/atoms/dev'
import themeState from '../../store/atoms/theme'
import { translate } from '../../translation'
import getSettingsThemes from './themes'

const styles = StyleSheet.create({
  rootPadding: {
    padding: 24,
  },
})

const ThemeSettingsScreen: React.FC = () => {
  const [{ theme }, setTheme] = useRecoilState(themeState)
  const { devMode } = useRecoilValue(devState)

  const onThemeValueChange = useCallback(
    (t: AppTheme) => {
      setTheme((prev) => ({
        ...prev,
        theme: t,
      }))
    },
    [setTheme]
  )

  const navigation = useNavigation()
  const settingsThemes = getSettingsThemes()
  const unlockedSettingsThemes = devMode
    ? settingsThemes
    : settingsThemes.filter((t) => !t.devOnly)

  const onPressBack = useCallback(async () => {
    await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.PREVIOUS_THEME, theme)

    if (navigation.canGoBack()) {
      navigation.goBack()
    }
  }, [navigation, theme])

  return (
    <>
      <SafeAreaView>
        <ScrollView contentContainerStyle={styles.rootPadding}>
          <Heading>{translate('selectThemeTitle')}</Heading>
          <RNPickerSelect
            placeholder={{}}
            style={{
              inputIOS: { fontSize: RFValue(14), marginVertical: 16 },
              inputAndroid: { fontSize: RFValue(14), marginVertical: 16 },
            }}
            items={unlockedSettingsThemes}
            value={theme}
            onValueChange={onThemeValueChange}
          />
        </ScrollView>
      </SafeAreaView>
      <FAB onPress={onPressBack} icon="md-checkmark" />
    </>
  )
}

export default ThemeSettingsScreen
