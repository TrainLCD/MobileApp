import { LocationObject } from 'expo-location';

import {
  LocationActionTypes,
  UPDATE_BAD_ACCURACY,
  UPDATE_LOCATION_SUCCESS,
} from '../types/location';

export const updateLocationSuccess = (
  location: LocationObject | Pick<LocationObject, 'coords'>
): LocationActionTypes => ({
  type: UPDATE_LOCATION_SUCCESS,
  payload: {
    location,
  },
});

export const updateBadAccuracy = (flag: boolean): LocationActionTypes => ({
  type: UPDATE_BAD_ACCURACY,
  payload: {
    flag,
  },
});
