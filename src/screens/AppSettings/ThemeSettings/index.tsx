import React, { useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import { useRecoilState, useRecoilValue } from 'recoil';
import AsyncStorage from '@react-native-async-storage/async-storage';
import analytics from '@react-native-firebase/analytics';
import Heading from '../../../components/Heading';
import getSettingsThemes from './themes';
import { translate } from '../../../translation';
import FAB from '../../../components/FAB';
import themeState from '../../../store/atoms/theme';
import AppTheme from '../../../models/Theme';
import trackState from '../../../store/atoms/track';

const styles = StyleSheet.create({
  rootPadding: {
    padding: 24,
  },
  settingItem: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    marginBottom: 32,
  },
});

const ThemeSettingsScreen: React.FC = () => {
  const [{ theme }, setTheme] = useRecoilState(themeState);
  const { optOut } = useRecoilValue(trackState);

  const onThemeValueChange = useCallback(
    (t: AppTheme) => {
      setTheme((prev) => ({
        ...prev,
        theme: t,
      }));
    },
    [setTheme]
  );

  const navigation = useNavigation();

  const onPressBack = useCallback(async () => {
    await AsyncStorage.setItem('@TrainLCD:previousTheme', theme.toString());

    if (!optOut) {
      try {
        await analytics().logEvent('themeSelected', {
          name: getSettingsThemes()[theme].label,
        });
      } catch (e) {
        console.error(e);
      }
    }

    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation, optOut, theme]);

  const settingsThemes = getSettingsThemes();

  return (
    <>
      <ScrollView contentContainerStyle={styles.rootPadding}>
        <Heading>{translate('selectThemeTitle')}</Heading>
        <View style={styles.settingItem}>
          <Picker
            selectedValue={theme}
            style={{
              width: '50%',
            }}
            onValueChange={onThemeValueChange}
          >
            {settingsThemes.map((t) => (
              <Picker.Item key={t.value} label={t.label} value={t.value} />
            ))}
          </Picker>
        </View>
      </ScrollView>
      <FAB onPress={onPressBack} icon="md-checkmark" />
    </>
  );
};

export default ThemeSettingsScreen;
