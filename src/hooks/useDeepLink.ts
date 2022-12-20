import { useNavigation } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { translate } from '../translation';
import useMirroringShare from './useMirroringShare';
import useResetMainState from './useResetMainState';

const useDeepLink = (): void => {
  const navigation = useNavigation();
  const { subscribe: subscribeMirroringShare } = useMirroringShare();
  const resetState = useResetMainState(false);

  const handleDeepLink = useCallback(
    async ({ url }: Linking.EventType, coldLaunch = false) => {
      if (url.startsWith('trainlcd://ms/')) {
        const msid = url.split('/').pop();
        if (msid) {
          try {
            if (!coldLaunch) {
              resetState();
            }
            await subscribeMirroringShare(msid);
            navigation.navigate('MainStack', { screen: 'Main' });
          } catch (err) {
            const msg = (err as { message: string }).message;
            Alert.alert(translate('errorTitle'), msg);
          }
        }
      }
    },
    [navigation, resetState, subscribeMirroringShare]
  );

  useEffect(() => {
    const processLinkAsync = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        await handleDeepLink({ url: initialUrl }, true);
      }
    };
    processLinkAsync();

    const subscription = Linking.addEventListener('url', handleDeepLink);
    return subscription.remove;
  }, [handleDeepLink]);
};

export default useDeepLink;
