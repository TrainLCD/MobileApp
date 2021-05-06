import { atom } from 'recoil';
import RECOIL_STATES from '../../constants/state';

export interface StationState {
  speechEnabled: boolean;
}

const speechState = atom<StationState>({
  key: RECOIL_STATES.speech,
  default: {
    speechEnabled: false,
  },
});

export default speechState;
