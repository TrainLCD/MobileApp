import { atom } from 'recoil';
import {
  DEFAULT_BOTTOM_TRANSITION_INTERVAL,
  DEFAULT_HEADER_TRANSITION_DELAY,
  DEFAULT_HEADER_TRANSITION_INTERVAL,
  RECOIL_STATES,
} from '../../constants';

export type TuningState = {
  headerTransitionInterval: number;
  headerTransitionDelay: number;
  bottomTransitionInterval: number;
};

const tuningState = atom<TuningState>({
  key: RECOIL_STATES.tuningState,
  default: {
    headerTransitionInterval: DEFAULT_HEADER_TRANSITION_INTERVAL,
    headerTransitionDelay: DEFAULT_HEADER_TRANSITION_DELAY,
    bottomTransitionInterval: DEFAULT_BOTTOM_TRANSITION_INTERVAL,
  },
});

export default tuningState;
