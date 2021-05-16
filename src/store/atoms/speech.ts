import { atom } from 'recoil';
import RECOIL_STATES from '../../constants/state';

export interface StationState {
  enabled: boolean;
  muted: boolean;
}

const speechState = atom<StationState>({
  key: RECOIL_STATES.speech,
  default: {
    enabled: false,
    muted: true,
  },
});

export default speechState;
