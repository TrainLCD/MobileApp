import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { useEffect, useState } from 'react';

const useAnonymousUser = (): FirebaseAuthTypes.User | null => {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((authUser) => {
      if (authUser) {
        setUser(authUser);
      } else {
        auth()
          .signInAnonymously()
          .then((credential) => setUser(credential.user));
      }
    });
    return unsubscribe;
  }, []);

  return user;
};

export default useAnonymousUser;
