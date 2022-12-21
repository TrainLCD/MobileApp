import { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { atom } from 'recoil';
import RECOIL_STATES from '../../constants/state';

export type AuthState = {
  user: FirebaseAuthTypes.User | null;
};

const authState = atom<AuthState>({
  key: RECOIL_STATES.authState,
  default: {
    user: null,
  },
});

export default authState;
