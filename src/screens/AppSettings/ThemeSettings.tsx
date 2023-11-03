import AsyncStorage from '@react-native-async-storage/async-storage'
import { Picker } from '@react-native-picker/picker'
import { useNavigation } from '@react-navigation/native'
import React, { useCallback } from 'react'
import { ScrollView, StyleSheet } from 'react-native'
import { useRecoilState } from 'recoil'
import FAB from '../../components/FAB'
import Heading from '../../components/Heading'
import { ASYNC_STORAGE_KEYS } from '../../constants/asyncStorageKeys'
import { LED_THEME_BG_COLOR } from '../../constants/color'
import { useIsLEDTheme } from '../../hooks/useIsLEDTheme'
import { AppTheme } from '../../models/Theme'
import themeState from '../../store/atoms/theme'
import { translate } from '../../translation'
import getSettingsThemes from './themes'
import { isDevApp } from '../../utils/isDevApp'

const styles = StyleSheet.create({
  rootPadding: {
    padding: 24,
  },
})

const ThemeSettingsScreen: React.FC = () => {
  const [{ theme }, setTheme] = useRecoilState(themeState)

  const isLEDTheme = useIsLEDTheme()

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
  const unlockedSettingsThemes = isDevApp
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
      <ScrollView contentContainerStyle={styles.rootPadding}>
        <Heading>{translate('selectThemeTitle')}</Heading>
        <Picker
          selectedValue={theme}
          onValueChange={onThemeValueChange}
          dropdownIconColor={isLEDTheme ? '#fff' : '#000'}
          style={{
            width: '100%',
          }}
        >
          {unlockedSettingsThemes.map((t) => (
            <Picker.Item
              color={isLEDTheme ? '#fff' : '#000'}
              style={{
                backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : undefined,
              }}
              key={t.value}
              label={t.label}
              value={t.value}
            />
          ))}
        </Picker>
      </ScrollView>
      <FAB onPress={onPressBack} icon="md-checkmark" />
    </>
  )
}

export default ThemeSettingsScreen
