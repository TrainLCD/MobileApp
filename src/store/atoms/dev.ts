import { atom } from 'recoil';
import RECOIL_STATES from '../../constants/state';

export interface DevState {
  devMode: boolean;
  token: string | null;
}

const devState = atom<DevState>({
  key: RECOIL_STATES.dev,
  default: {
    devMode: __DEV__,
    token: null,
  },
});

export default devState;
