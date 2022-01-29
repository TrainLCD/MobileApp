import { atom } from 'recoil';
import RECOIL_STATES from '../../constants/state';

export interface MirroringShareState {
  subscribed: boolean;
  publishing: boolean;
  token: string | null;
}

const mirroringShareState = atom<MirroringShareState>({
  key: RECOIL_STATES.line,
  default: {
    subscribed: false,
    publishing: false,
    token: null,
  },
});

export default mirroringShareState;
