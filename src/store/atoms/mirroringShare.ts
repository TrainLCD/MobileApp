import { atom } from 'recoil';
import RECOIL_STATES from '../../constants/state';

export interface MirroringShareState {
  subscribing: boolean;
  publishing: boolean;
  token: string | null;
}

const mirroringShareState = atom<MirroringShareState>({
  key: RECOIL_STATES.mirroringShareState,
  default: {
    subscribing: false,
    publishing: false,
    token: null,
  },
});

export default mirroringShareState;
