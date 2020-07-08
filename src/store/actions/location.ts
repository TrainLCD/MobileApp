import { LocationData } from 'expo-location';

import {
  LocationActionTypes,
  UPDATE_BAD_ACCURACY,
  UPDATE_LOCATION_SUCCESS,
} from '../types/location';

export const updateLocationSuccess = (
  location: LocationData | Pick<LocationData, 'coords'>
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
