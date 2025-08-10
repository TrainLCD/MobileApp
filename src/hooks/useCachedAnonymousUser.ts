import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
} from '@react-native-firebase/auth';
import { useAtom } from 'jotai';
import { useEffect } from 'react';
import authState from '../store/atoms/auth';

export const useCachedInitAnonymousUser = (): FirebaseAuthTypes.User | null => {
  const [{ user }, setUser] = useAtom(authState);

  useEffect(() => {
    // アプリ実行中に匿名ユーザーが変わることはないので、キャッシュしている値を使用し追加で取得しない
    if (user) {
      return () => undefined;
    }

    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        setUser((prev) => ({ ...prev, user: authUser }));
      } else {
        const credential = await signInAnonymously(auth);
        setUser((prev) => ({ ...prev, user: credential.user }));
      }
    });
    return unsubscribe;
  }, [setUser, user]);

  return user;
};
