import AsyncStorage from '@react-native-async-storage/async-storage'
import { Picker } from '@react-native-picker/picker'
import { useNavigation } from '@react-navigation/native'
import React, { useCallback } from 'react'
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native'
import { RFValue } from 'react-native-responsive-fontsize'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRecoilState } from 'recoil'
import {
  ASYNC_STORAGE_KEYS,
  LED_THEME_BG_COLOR,
  POWER_SAVING_PRESETS,
  PowerSavingPreset,
} from '../constants'
import { useIsLEDTheme } from '../hooks/useIsLEDTheme'
import powerSavingState from '../store/atoms/powerSaving'
import { translate } from '../translation'
import FAB from './FAB'
import Heading from './Heading'
import Typography from './Typography'

const styles = StyleSheet.create({
  root: {
    height: Dimensions.get('window').height,
    paddingVertical: 24,
  },
  settingItemTitle: {
    fontSize: RFValue(12),
    fontWeight: 'bold',
    marginTop: 12,
  },
})

const PowerSavingSettings: React.FC = () => {
  const [{ preset: presetFromState }, setPowerSavingState] =
    useRecoilState(powerSavingState)
  const navigation = useNavigation()
  const { left: safeAreaLeft, right: safeAreaRight } = useSafeAreaInsets()
  const isLEDTheme = useIsLEDTheme()

  const onPressBack = useCallback(async () => {
    await AsyncStorage.setItem(
      ASYNC_STORAGE_KEYS.PREFERRED_POWER_SAVING_PRESET,
      presetFromState
    )

    if (navigation.canGoBack()) {
      navigation.goBack()
    }
  }, [navigation, presetFromState])

  const POWER_SAVING_PRESET_NAMES = {
    [POWER_SAVING_PRESETS.LOW_ENERGY]: translate('lowAccuracyPreset'),
    [POWER_SAVING_PRESETS.BALANCED]: translate('balancedAccuracyPreset'),
    [POWER_SAVING_PRESETS.HIGH_ACCURACY]: translate('highAccuracyPreset'),
  } as const

  const handleLocationAccuracyChange = (preset: PowerSavingPreset) =>
    setPowerSavingState((prev) => ({ ...prev, preset }))

  const savingPresets = Object.entries(POWER_SAVING_PRESETS).map(
    ([key, value]) => ({
      label: POWER_SAVING_PRESET_NAMES[key as PowerSavingPreset],
      value,
    })
  )

  return (
    <View>
      <ScrollView
        contentContainerStyle={{
          ...styles.root,
          backgroundColor: isLEDTheme ? '#212121' : '#fff',
          paddingLeft: safeAreaLeft || 32,
          paddingRight: safeAreaRight || 32,
        }}
      >
        <Heading>{translate('powerSave')}</Heading>
        <Typography style={styles.settingItemTitle}>
          {translate('presets')}
        </Typography>
        <Picker
          selectedValue={presetFromState}
          onValueChange={handleLocationAccuracyChange}
          dropdownIconColor={isLEDTheme ? '#fff' : '#000'}
        >
          {savingPresets.map((item) => (
            <Picker.Item
              key={item.value}
              color={isLEDTheme ? '#fff' : '#000'}
              style={{
                backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : undefined,
              }}
              label={item.label.toString()}
              value={item.value}
            />
          ))}
        </Picker>
      </ScrollView>
      <FAB onPress={onPressBack} icon="md-close" />
    </View>
  )
}

export default React.memo(PowerSavingSettings)
