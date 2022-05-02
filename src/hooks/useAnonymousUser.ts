import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { useEffect, useState } from 'react';

const useAnonymousUser = (): FirebaseAuthTypes.User | null => {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);

  useEffect(() => {
    auth().onAuthStateChanged(async (authUser) => {
      if (authUser) {
        setUser(authUser);
      } else {
        const credential = await auth().signInAnonymously();
        setUser(credential.user);
      }
    });
  }, []);

  return user;
};

export default useAnonymousUser;
