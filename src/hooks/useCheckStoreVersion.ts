import { useCallback, useEffect } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import VersionCheck from 'react-native-version-check';
import { translate } from '../translation';
import navigationState from '~/store/atoms/navigation';
import { useSetAtom } from 'jotai';
import { APP_STORE_URL, GOOGLE_PLAY_URL } from '~/constants';

export const useCheckStoreVersion = (): void => {
  const setNavigationState = useSetAtom(navigationState);

  const showUpdateRequestDialog = useCallback((storeURL: string) => {
    Alert.alert(
      translate('announcementTitle'),
      translate('newVersionAvailableText'),
      [
        { text: translate('cancel'), style: 'cancel' },
        {
          text: translate('update'),
          style: 'destructive',
          onPress: () => {
            Linking.openURL(storeURL);
          },
        },
      ]
    );
  }, []);

  useEffect(() => {
    const f = async () => {
      if (__DEV__) {
        return;
      }
      try {
        const res = await VersionCheck.needUpdate();
        if (res?.isNeeded) {
          showUpdateRequestDialog(
            Platform.select({
              ios: APP_STORE_URL,
              android: GOOGLE_PLAY_URL,
            }) ?? ''
          );
        } else {
          setNavigationState((prev) => ({
            ...prev,
            isAppLatest: true,
          }));
        }
      } catch (error) {
        console.error(error);
      }
    };
    f();
  }, [showUpdateRequestDialog, setNavigationState]);
};
