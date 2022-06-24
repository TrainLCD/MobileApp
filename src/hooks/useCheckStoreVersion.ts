import * as Application from 'expo-application';
import { useEffect, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import VersionCheck from 'react-native-version-check';
import { translate } from '../translation';

const useCheckStoreVersion = (): void => {
  const [isNewVersionAvailable, setIsNewVersionAvailable] = useState(false);
  const [storeUrl, setStoreUrl] = useState<string>();

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
      setIsNewVersionAvailable(!!res?.isNeeded);
      setStoreUrl(res?.storeUrl);
    };
    f();
  }, []);

  useEffect(() => {
    if (isNewVersionAvailable) {
      Alert.alert(
        translate('annoucementTitle'),
        translate('newVersionAvailableText'),
        storeUrl
          ? [
              { text: 'OK', style: 'cancel' },
              {
                text: translate('update'),
                style: 'destructive',
                onPress: () => {
                  Linking.openURL(storeUrl);
                },
              },
            ]
          : [{ text: 'OK', style: 'cancel' }]
      );
    }
  }, [isNewVersionAvailable, storeUrl]);
};

export default useCheckStoreVersion;
