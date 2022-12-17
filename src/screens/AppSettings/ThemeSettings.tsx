import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRecoilState, useRecoilValue } from 'recoil';
import FAB from '../../components/FAB';
import Heading from '../../components/Heading';
import { ASYNC_STORAGE_KEYS } from '../../constants/asyncStorageKeys';
import { AppTheme } from '../../models/Theme';
import devState from '../../store/atoms/dev';
import themeState from '../../store/atoms/theme';
import { translate } from '../../translation';
import getSettingsThemes from './themes';

const styles = StyleSheet.create({
  rootPadding: {
    padding: 24,
  },
  settingItem: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const ThemeSettingsScreen: React.FC = () => {
  const [{ theme }, setTheme] = useRecoilState(themeState);
  const { devMode } = useRecoilValue(devState);

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
  const settingsThemes = getSettingsThemes();
  const unlockedSettingsThemes = devMode
    ? settingsThemes
    : settingsThemes.filter((t) => !t.devOnly);

  const onPressBack = useCallback(async () => {
    await AsyncStorage.setItem(
      ASYNC_STORAGE_KEYS.PreviousTheme,
      theme.toString()
    );

    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation, theme]);

  return (
    <>
      <ScrollView contentContainerStyle={styles.rootPadding}>
        <Heading>{translate('selectThemeTitle')}</Heading>
        <View style={styles.settingItem}>
          <Picker
            selectedValue={theme}
            onValueChange={onThemeValueChange}
            style={{
              width: '50%',
            }}
          >
            {unlockedSettingsThemes.map((t) => (
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
