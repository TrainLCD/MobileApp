import AsyncStorage from '@react-native-async-storage/async-storage';
import analytics from '@react-native-firebase/analytics';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRecoilState } from 'recoil';
import FAB from '../../../components/FAB';
import Heading from '../../../components/Heading';
import AsyncStorageKeys from '../../../constants/asyncStorageKeys';
import AppTheme from '../../../models/Theme';
import themeState from '../../../store/atoms/theme';
import { translate } from '../../../translation';
import getSettingsThemes from './themes';

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

  const onPressBack = useCallback(async () => {
    await AsyncStorage.setItem(
      AsyncStorageKeys.PreviousTheme,
      theme.toString()
    );
    await analytics().logEvent('themeSelected', {
      id: theme,
      name: settingsThemes?.find((t) => t.value === theme)?.label,
    });

    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation, settingsThemes, theme]);

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
