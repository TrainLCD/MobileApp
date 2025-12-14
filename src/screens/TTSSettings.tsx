import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heading } from '~/components/Heading';
import { translate } from '~/translation';
import FAB from '../components/FAB';
import { ASYNC_STORAGE_KEYS } from '../constants';
import { useThemeStore } from '../hooks';

// const styles = StyleSheet.create({});

const TTSSettingsScreen: React.FC = () => {
  const theme = useThemeStore((state) => state);
  const navigation = useNavigation();

  const onPressBack = useCallback(async () => {
    await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.PREVIOUS_THEME, theme);

    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation, theme]);

  return (
    <>
      <SafeAreaView>
        <Heading>{translate('autoAnnounce')}</Heading>
      </SafeAreaView>
      <FAB onPress={onPressBack} icon="checkmark" />
    </>
  );
};

export default React.memo(TTSSettingsScreen);
