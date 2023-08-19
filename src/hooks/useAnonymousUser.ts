import { FirebaseAuthTypes } from '@react-native-firebase/auth'
import { useEffect, useState } from 'react'
import auth from '../vendor/firebase/auth'

/**
 * Recoilが使えない環境の時にもユーザーを持ちたい場合に使います。基本的に `useCachedAnonymousUser` を使ってください。
 */
const useAnonymousUser = (): FirebaseAuthTypes.User | undefined => {
  const [user, setUser] = useState<FirebaseAuthTypes.User>()
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((authUser) => {
      if (authUser) {
        setUser(authUser)
      } else {
        auth()
          .signInAnonymously()
          .then((credential) => setUser(credential.user))
      }
    })
    return unsubscribe
  }, [setUser, user])

  return user
}

export default useAnonymousUser
