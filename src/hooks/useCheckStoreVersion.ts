import * as Application from 'expo-application';
import { useEffect } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import VersionCheck from 'react-native-version-check';
import { translate } from '../translation';

const useCheckStoreVersion = (): void => {
  const showUpdateRequestDialog = (storeURL: string) => {
    Alert.alert(
      translate('annoucementTitle'),
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
  };

  useEffect(() => {
    const f = async () => {
      if (!Application.nativeApplicationVersion) {
        return;
      }
      const storeLatestVersion = Platform.select({
        ios: await VersionCheck.getLatestVersion({
          provider: 'appStore',
        }),
        android: await VersionCheck.getLatestVersion({
          provider: 'playStore',
        }),
      });
      const res = await VersionCheck.needUpdate({
        latestVersion: storeLatestVersion,
        currentVersion: Application.nativeApplicationVersion,
      });
      if (res.isNeeded) {
        showUpdateRequestDialog(res.storeUrl);
      }
    };
    f();
  }, []);
};

export default useCheckStoreVersion;
