import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { useEffect } from 'react';
import { useRecoilState } from 'recoil';
import authState from '../store/atoms/auth';

const useInitAnonymousUser = (): FirebaseAuthTypes.User | null => {
  const [{ user }, setUser] = useRecoilState(authState);

  useEffect(() => {
    // アプリ実行中に匿名ユーザーが変わることはないので、キャッシュしている値を使用し追加で取得しない
    if (user) {
      return () => undefined;
    }

    const unsubscribe = auth().onAuthStateChanged((authUser) => {
      if (authUser) {
        setUser((prev) => ({ ...prev, user: authUser }));
      } else {
        auth()
          .signInAnonymously()
          .then((credential) =>
            setUser((prev) => ({ ...prev, user: credential.user }))
          );
      }
    });
    return unsubscribe;
  }, [setUser, user]);

  return user;
};

export default useInitAnonymousUser;
