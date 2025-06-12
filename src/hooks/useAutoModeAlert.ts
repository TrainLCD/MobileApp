import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAtomValue } from 'jotai';
import { useEffect } from 'react';
import { Alert } from 'react-native';
import { ASYNC_STORAGE_KEYS } from '~/constants';
import navigationState from '~/store/atoms/navigation';
import { translate } from '~/translation';

export const useAutoModeAlert = () => {
  const { autoModeEnabled, enableLegacyAutoMode } =
    useAtomValue(navigationState);

  useEffect(() => {
    const showAlert = async (): Promise<void> => {
      try {
        const alreadyConfirmed = await AsyncStorage.getItem(
          ASYNC_STORAGE_KEYS.AUTO_MODE_V2_CONFIRMED
        );
        if (autoModeEnabled && !enableLegacyAutoMode && !alreadyConfirmed) {
          Alert.alert(
            translate('announcementTitle'),
            translate('autoModeV2AlertText'),
            [
              {
                text: translate('doNotShowAgain'),
                style: 'cancel',
                onPress: async (): Promise<void> => {
                  await AsyncStorage.setItem(
                    ASYNC_STORAGE_KEYS.AUTO_MODE_V2_CONFIRMED,
                    'true'
                  );
                },
              },
              {
                text: 'OK',
              },
            ]
          );
        }
      } catch (error) {
        console.error(error);
      }
    };

    showAlert();
  }, [autoModeEnabled, enableLegacyAutoMode]);
};
