import { LocationObject } from 'expo-location';
import { atom } from 'recoil';
import RECOIL_STATES from '../../constants/state';

export interface LocationState {
  location:
    | LocationObject
    | Pick<LocationObject, 'coords'>
    | { coords: { latitude: number; longitude: number } };
  badAccuracy: boolean;
}

const locationState = atom<LocationState>({
  key: RECOIL_STATES.location,
  default: {
    location: null,
    badAccuracy: false,
  },
});

export default locationState;
