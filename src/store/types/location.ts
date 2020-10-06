import { LocationObject } from 'expo-location';

export const UPDATE_LOCATION_SUCCESS = 'UPDATE_LOCATION_SUCCESS';
export const UPDATE_BAD_ACCURACY = 'UPDATE_BAD_ACCURACY';

interface UpdateLocationSuccessPayload {
  location: LocationObject | Pick<LocationObject, 'coords'>;
}

interface UpdateLocationSuccessAction {
  type: typeof UPDATE_LOCATION_SUCCESS;
  payload: UpdateLocationSuccessPayload;
}

interface UpdateBadAccuracyPayload {
  flag: boolean;
}

interface UpdateBadAccuracyAction {
  type: typeof UPDATE_BAD_ACCURACY;
  payload: UpdateBadAccuracyPayload;
}

export type LocationActionTypes =
  | UpdateLocationSuccessAction
  | UpdateBadAccuracyAction;
