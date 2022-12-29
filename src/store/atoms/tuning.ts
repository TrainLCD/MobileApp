import * as Location from 'expo-location';
import { atom } from 'recoil';
import {
  DEFAULT_BOTTOM_TRANSITION_INTERVAL,
  DEFAULT_HEADER_TRANSITION_DELAY,
  DEFAULT_HEADER_TRANSITION_INTERVAL,
} from '../../constants';
import RECOIL_STATES from '../../constants/state';

export type TuningState = {
  locationAccuracy: Location.LocationAccuracy | null;
  headerTransitionInterval: number;
  headerTransitionDelay: number;
  bottomTransitionInterval: number;
};

const tuningState = atom<TuningState>({
  key: RECOIL_STATES.tuningState,
  default: {
    locationAccuracy: null,
    headerTransitionInterval: DEFAULT_HEADER_TRANSITION_INTERVAL,
    headerTransitionDelay: DEFAULT_HEADER_TRANSITION_DELAY,
    bottomTransitionInterval: DEFAULT_BOTTOM_TRANSITION_INTERVAL,
  },
});

export default tuningState;
