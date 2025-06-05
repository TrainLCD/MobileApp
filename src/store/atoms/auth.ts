import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { atom } from 'jotai';

export type AuthState = {
  user: FirebaseAuthTypes.User | null;
};

const authState = atom<AuthState>({
  user: null,
});

export default authState;
