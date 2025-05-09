import { useCallback, useEffect } from 'react';
import { Alert, Linking } from 'react-native';
import VersionCheck from 'react-native-version-check';
import { translate } from '../translation';

const useCheckStoreVersion = (): void => {
  const showUpdateRequestDialog = useCallback((storeURL: string) => {
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
  }, []);

  useEffect(() => {
    const f = async () => {
      if (__DEV__) {
        return;
      }
      const res = await VersionCheck.needUpdate();
      if (res?.isNeeded && res?.storeUrl) {
        showUpdateRequestDialog(res.storeUrl);
      }
    };
    f();
  }, [showUpdateRequestDialog]);
};

export default useCheckStoreVersion;
