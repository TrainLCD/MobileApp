import { atom } from 'recoil';
import RECOIL_STATES from '../../constants/state';

export interface DevState {
  devMode: boolean;
}

const devState = atom<DevState>({
  key: RECOIL_STATES.dev,
  default: {
    devMode: __DEV__,
  },
});

export default devState;
