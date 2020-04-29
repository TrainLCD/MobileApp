import { LocationData } from 'expo-location';

export const UPDATE_LOCATION_START = 'UPDATE_LOCATION_START';
export const UPDATE_LOCATION_SUCCESS = 'UPDATE_LOCATION_SUCCESS';
export const UPDATE_LOCATION_FAILED = 'UPDATE_LOCATION_FAILED';
export const UPDATE_BAD_ACCURACY = 'UPDATE_BAD_ACCURACY';

interface UpdateLocationStartAction {
  type: typeof UPDATE_LOCATION_START;
}

interface UpdateLocationSuccessPayload {
  location: LocationData;
}

interface UpdateLocationSuccessAction {
  type: typeof UPDATE_LOCATION_SUCCESS;
  payload: UpdateLocationSuccessPayload;
}

interface UpdateLocationFailedPayload {
  error: Error;
}

interface UpdateLocationFailedAction {
  type: typeof UPDATE_LOCATION_FAILED;
  payload: UpdateLocationFailedPayload;
}

interface UpdateBadAccuracyPayload {
  flag: boolean;
}

interface UpdateBadAccuracyAction {
  type: typeof UPDATE_BAD_ACCURACY;
  payload: UpdateBadAccuracyPayload;
}

export type LocationActionTypes =
  | UpdateLocationStartAction
  | UpdateLocationSuccessAction
  | UpdateLocationFailedAction
  | UpdateBadAccuracyAction;
