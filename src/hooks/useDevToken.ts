import AsyncStorage from '@react-native-async-storage/async-storage';
import * as firestore from '@react-native-firebase/firestore';
import { useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { useRecoilState, useRecoilValue } from 'recoil';
import { ASYNC_STORAGE_KEYS } from '../constants/asyncStorageKeys';
import authState from '../store/atoms/auth';
import devState from '../store/atoms/dev';
import { translate } from '../translation';
import changeAppIcon from '../utils/native/customIconModule';

const useDevToken = (
  watchEligibility = false
): {
  checkEligibility: (
    newToken: string
  ) => Promise<'eligible' | 'ineligible' | 'notMatched'>;
  setToken: (newToken: string) => void;
} => {
  const { user } = useRecoilValue(authState);
  const [{ token }, setDevState] = useRecoilState(devState);

  const checkEligibility = useCallback(
    async (
      newToken: string
    ): Promise<'eligible' | 'ineligible' | 'notMatched'> => {
      if (!user) {
        return 'notMatched';
      }
      try {
        const devTokenDoc = await firestore
          .default()
          .collection('devTokens')
          .doc(newToken)
          .get();

        return devTokenDoc.get('eligible') ? 'eligible' : 'ineligible';
      } catch (err) {
        return 'notMatched';
      }
    },
    [user]
  );

  useEffect(() => {
    const f = async () => {
      if (watchEligibility && token) {
        const eligibility = await checkEligibility(token);
        switch (eligibility) {
          case 'eligible':
            setDevState((prev) => ({
              ...prev,
              devMode: true,
            }));
            break;
          case 'ineligible':
            setDevState((prev) => ({
              ...prev,
              devMode: false,
              token: null,
            }));
            await AsyncStorage.removeItem(ASYNC_STORAGE_KEYS.DEV_MODE_ENABLED);
            await AsyncStorage.removeItem(ASYNC_STORAGE_KEYS.DEV_MODE_TOKEN);
            Alert.alert(
              translate('notice'),
              translate('ineligibleDevModeDescription'),
              [{ text: 'OK', onPress: () => changeAppIcon(null) }]
            );
            break;
          default:
            break;
        }
      }
    };
    f();
  }, [checkEligibility, setDevState, token, watchEligibility]);

  const setToken = useCallback(
    (newToken: string) => setDevState((prev) => ({ ...prev, token: newToken })),
    [setDevState]
  );

  return { checkEligibility, setToken };
};

export default useDevToken;
