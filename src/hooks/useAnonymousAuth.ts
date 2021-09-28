import { useEffect, useState } from 'react';
import * as auth from '@react-native-firebase/auth';

type Result = {
  user: auth.FirebaseAuthTypes.User | null;
  signInAnonymously: () => Promise<auth.FirebaseAuthTypes.UserCredential>;
};
const useAnonymousAuth = (): Result => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.default().onAuthStateChanged((_user) => {
      if (_user) {
        setUser(_user);
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const signInAnonymously = async () => auth.default().signInAnonymously();

  return { user, signInAnonymously };
};

export default useAnonymousAuth;
