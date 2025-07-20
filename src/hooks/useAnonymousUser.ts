import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import auth from '@react-native-firebase/auth';
import { useEffect, useRef } from 'react';

/**
 * Jotaiが使えない環境の時にもユーザーを持ちたい場合に使います。基本的に `useCachedAnonymousUser` を使ってください。
 */
export const useAnonymousUser = (): FirebaseAuthTypes.User | null => {
  const userRef = useRef<FirebaseAuthTypes.User | null>(null);
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((authUser) => {
      if (authUser) {
        userRef.current = authUser;
      } else {
        auth()
          .signInAnonymously()
          .then((credential) => {
            userRef.current = credential.user;
          });
      }
    });
    return unsubscribe;
  }, []);

  return userRef.current;
};
