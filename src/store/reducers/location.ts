import { LocationData } from 'expo-location';

import { LocationActionTypes } from '../types/location';

export interface ILocationState {
  location: LocationData;
  error: Error;
  badAccuracy: boolean;
}

const initialState: ILocationState = {
  location: null,
  error: null,
  badAccuracy: false,
};

const locationReducer = (
  state = initialState,
  action: LocationActionTypes,
): ILocationState => {
  switch (action.type) {
    case 'UPDATE_LOCATION_START':
      return state;
    case 'UPDATE_LOCATION_SUCCESS':
      return {
        ...state,
        location: action.payload.location,
      };
    case 'UPDATE_LOCATION_FAILED':
      return {
        ...state,
        error: action.payload.error,
      };
    case 'UPDATE_BAD_ACCURACY':
      return {
        ...state,
        badAccuracy: action.payload.flag,
      }
    default:
      return state;
  }
};

export default locationReducer;
