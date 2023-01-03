import { useEffect } from 'react';
import { Alert, Linking } from 'react-native';
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
      const res = await VersionCheck.needUpdate();
      if (res?.isNeeded) {
        showUpdateRequestDialog(res.storeUrl);
      }
    };
    f();
  }, []);
};

export default useCheckStoreVersion;
