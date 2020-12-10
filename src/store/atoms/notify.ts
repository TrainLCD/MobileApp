import { atom } from 'recoil';
import RECOIL_STATES from '../../constants/state';

export interface NotifyState {
  targetStationIds: number[];
}

const notifyState = atom<NotifyState>({
  key: RECOIL_STATES.notify,
  default: {
    targetStationIds: [],
  },
});

export default notifyState;
