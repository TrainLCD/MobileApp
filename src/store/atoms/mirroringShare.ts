import { atom } from 'recoil';
import RECOIL_STATES from '../../constants/state';

export interface MirroringShareState {
  subscribing: boolean;
  publishing: boolean;
  token: string | null;
  publishStartedAt: Date | null;
  totalVisitors: number;
  activeVisitors: number;
}

const mirroringShareState = atom<MirroringShareState>({
  key: RECOIL_STATES.mirroringShareState,
  default: {
    subscribing: false,
    publishing: false,
    token: null,
    publishStartedAt: null,
    totalVisitors: 0,
    activeVisitors: 0,
  },
});

export default mirroringShareState;
