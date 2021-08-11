import { atom } from 'recoil';
import RECOIL_STATES from '../../constants/state';

export interface TrackState {
  optOut: boolean;
}

const trackState = atom<TrackState>({
  key: RECOIL_STATES.track,
  default: {
    optOut: false,
  },
});

export default trackState;
