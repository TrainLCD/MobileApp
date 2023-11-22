import AsyncStorage from '@react-native-async-storage/async-storage'
import { Picker } from '@react-native-picker/picker'
import { useNavigation } from '@react-navigation/native'
import React, { useCallback } from 'react'
import { StyleSheet, View } from 'react-native'
import { useRecoilState } from 'recoil'
import FAB from '../../components/FAB'
import Heading from '../../components/Heading'
import { ASYNC_STORAGE_KEYS, LED_THEME_BG_COLOR } from '../../constants'
import { useIsLEDTheme } from '../../hooks/useIsLEDTheme'
import { AppTheme } from '../../models/Theme'
import themeState from '../../store/atoms/theme'
import { translate } from '../../translation'
import { isDevApp } from '../../utils/isDevApp'
import getSettingsThemes from './themes'

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
      <View style={styles.rootPadding}>
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
      </View>
      <FAB onPress={onPressBack} icon="md-checkmark" />
    </>
  )
}

export default React.memo(ThemeSettingsScreen)
