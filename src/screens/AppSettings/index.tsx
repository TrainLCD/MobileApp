import { useNavigation } from '@react-navigation/native'
import React, { useCallback } from 'react'
import { SafeAreaView, StyleSheet, View } from 'react-native'
import { RFValue } from 'react-native-responsive-fontsize'
import Button from '../../components/Button'
import FAB from '../../components/FAB'
import Heading from '../../components/Heading'
import { translate } from '../../translation'
import { isDevApp } from '../../utils/isDevApp'

const styles = StyleSheet.create({
  rootPadding: {
    marginTop: 24,
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
  const toPowerSave = () => navigation.navigate('PowerSavingSettings')

  return (
    <>
      <SafeAreaView style={styles.rootPadding}>
        <Heading>{translate('settings')}</Heading>

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
            <>
              <View style={styles.settingItem}>
                <Button onPress={toPowerSave}>{translate('powerSave')}</Button>
              </View>

              <View style={styles.settingItem}>
                <Button onPress={toTuning}>{translate('tuning')}</Button>
              </View>
            </>
          ) : null}
        </View>
      </SafeAreaView>
      <FAB onPress={onPressBack} icon="md-close" />
    </>
  )
}

export default React.memo(AppSettingsScreen)
