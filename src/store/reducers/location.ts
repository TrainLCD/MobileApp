import { LocationData } from 'expo-location';

import { LocationActionTypes } from '../types/location';

export interface LocationState {
  location: LocationData;
  badAccuracy: boolean;
}

const initialState: LocationState = {
  location: null,
  badAccuracy: false,
};

const locationReducer = (
  state = initialState,
  action: LocationActionTypes
): LocationState => {
  switch (action.type) {
    case 'UPDATE_LOCATION_START':
      return state;
    case 'UPDATE_LOCATION_SUCCESS':
      return {
        ...state,
        location: action.payload.location,
      };
    case 'UPDATE_BAD_ACCURACY':
      return {
        ...state,
        badAccuracy: action.payload.flag,
      };
    default:
      return state;
  }
};

export default locationReducer;
