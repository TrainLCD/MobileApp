import { useSetAtom } from 'jotai';
import { useCallback, useEffect } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import VersionCheck from 'react-native-version-check';
import { APP_STORE_URL, GOOGLE_PLAY_URL } from '~/constants';
import navigationState from '~/store/atoms/navigation';
import { translate } from '../translation';

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
    if (__DEV__) {
      setNavigationState((prev) => ({
        ...prev,
        isAppLatest: true,
      }));
      return;
    }

    const checkVersion = async () => {
      try {
        const res = await VersionCheck.needUpdate();
        if (res?.isNeeded) {
          const url = Platform.select({
            ios: APP_STORE_URL,
            android: GOOGLE_PLAY_URL,
          });
          if (!url) {
            return;
          }
          showUpdateRequestDialog(url);
        } else {
          setNavigationState((prev) => ({
            ...prev,
            isAppLatest: true,
          }));
        }
      } catch {
        // バージョンチェック失敗時も最新版として扱う
        setNavigationState((prev) => ({
          ...prev,
          isAppLatest: true,
        }));
      }
    };

    checkVersion();
  }, [showUpdateRequestDialog, setNavigationState]);
};
