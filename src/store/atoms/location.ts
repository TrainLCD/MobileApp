import { LocationObject } from 'expo-location';
import { atom } from 'recoil';
import RECOIL_STATES from '../../constants/state';
import { HMSLocationObject } from '../../models/HMSLocationObject';

export interface LocationState {
  location: LocationObject | Pick<LocationObject, 'coords'> | HMSLocationObject;
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
