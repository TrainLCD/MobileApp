import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeList } from '~/components/ThemeList';
import { getSettingsThemes } from '~/utils/theme';
import FAB from '../../components/FAB';
import { Heading } from '../../components/Heading';
import { ASYNC_STORAGE_KEYS } from '../../constants';
import { useThemeStore } from '../../hooks';
import type { AppTheme } from '../../models/Theme';
import { translate } from '../../translation';
import { isDevApp } from '../../utils/isDevApp';

const styles = StyleSheet.create({
  rootPadding: {
    marginTop: 12,
  },
  listContainer: {
    height: '100%',
    paddingBottom: 96,
    marginTop: 12,
  },
});

const ThemeSettingsScreen: React.FC = () => {
  const theme = useThemeStore((state) => state);

  const onThemeValueChange = useCallback((t: AppTheme) => {
    useThemeStore.setState(t);
  }, []);

  const navigation = useNavigation();
  const unlockedSettingsThemes = useMemo(() => {
    const settingsThemes = getSettingsThemes();
    return isDevApp ? settingsThemes : settingsThemes.filter((t) => !t.devOnly);
  }, []);

  const onPressBack = useCallback(async () => {
    await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.PREVIOUS_THEME, theme);

    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation, theme]);

  return (
    <>
      <SafeAreaView style={styles.rootPadding}>
        <Heading>{translate('selectThemeTitle')}</Heading>
        <View style={styles.listContainer}>
          <ThemeList
            data={unlockedSettingsThemes}
            onSelect={onThemeValueChange}
          />
        </View>
      </SafeAreaView>
      <FAB onPress={onPressBack} icon="checkmark" />
    </>
  );
};

export default React.memo(ThemeSettingsScreen);
