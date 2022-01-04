import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import { useRecoilState } from 'recoil';
import FAB from '../../../components/FAB';
import Heading from '../../../components/Heading';
import PickerChevronIcon from '../../../components/PickerChevronIcon';
import AsyncStorageKeys from '../../../constants/asyncStorageKeys';
import usePickerStyle from '../../../hooks/usePickerStyle';
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

  const pickerStyle = usePickerStyle();

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

    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation, theme]);

  return (
    <>
      <ScrollView contentContainerStyle={styles.rootPadding}>
        <Heading>{translate('selectThemeTitle')}</Heading>
        <View style={styles.settingItem}>
          <RNPickerSelect
            value={theme}
            placeholder={{}}
            doneText={translate('pickerDone')}
            onValueChange={onThemeValueChange}
            items={settingsThemes}
            style={pickerStyle}
            Icon={PickerChevronIcon}
          />
        </View>
      </ScrollView>
      <FAB onPress={onPressBack} icon="md-checkmark" />
    </>
  );
};

export default ThemeSettingsScreen;
