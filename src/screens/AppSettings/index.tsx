import { useNavigation } from '@react-navigation/native'
import React, { useCallback } from 'react'
import { SafeAreaView, StyleSheet, View } from 'react-native'
import { RFValue } from 'react-native-responsive-fontsize'
import Button from '../../components/Button'
import FAB from '../../components/FAB'
import Heading from '../../components/Heading'
import Typography from '../../components/Typography'
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
  ttsSuspendedTextContainer: {
    marginTop: 16,
    flexDirection: 'column',
  },
  ttsSuspendedText: {
    textAlign: 'center',
    lineHeight: 21,
    fontWeight: 'bold',
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

  return (
    <>
      <SafeAreaView style={styles.rootPadding}>
        <Heading>{translate('settings')}</Heading>
        <View style={styles.ttsSuspendedTextContainer}>
          <Typography style={styles.ttsSuspendedText}>
            {translate('ttsRemovedNotice')}
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

          {isDevApp ? (
            <>
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

export default AppSettingsScreen
