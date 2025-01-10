import type { FirebaseAuthTypes } from "@react-native-firebase/auth";
import auth from "@react-native-firebase/auth";
import { useEffect, useRef } from "react";

/**
 * Recoilが使えない環境の時にもユーザーを持ちたい場合に使います。基本的に `useCachedAnonymousUser` を使ってください。
 */
const useAnonymousUser = (): FirebaseAuthTypes.User | undefined => {
	const userRef = useRef<FirebaseAuthTypes.User>();
	useEffect(() => {
		const unsubscribe = auth().onAuthStateChanged((authUser) => {
			if (authUser) {
				userRef.current = authUser;
			} else {
				auth()
					.signInAnonymously()
					.then((credential) => (userRef.current = credential.user));
			}
		});
		return unsubscribe;
	}, []);

	return userRef.current;
};

export default useAnonymousUser;
