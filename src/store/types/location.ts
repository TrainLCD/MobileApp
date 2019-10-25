import { LocationData } from 'expo-location';

export const UPDATE_LOCATION_START = 'UPDATE_LOCATION_START';
export const UPDATE_LOCATION_SUCCESS = 'UPDATE_LOCATION_SUCCESS';
export const UPDATE_LOCATION_FAILED = 'UPDATE_LOCATION_FAILED';

interface IUpdateLocationStartAction {
  type: typeof UPDATE_LOCATION_START;
}

interface IUpdateLocationSuccessPayload {
  location: LocationData;
}

interface IUpdateLocationSuccessAction {
  type: typeof UPDATE_LOCATION_SUCCESS;
  payload: IUpdateLocationSuccessPayload;
}

interface IUpdateLocationFailedPayload {
  error: Error;
}

interface IUpdateLocationFailedAction {
  type: typeof UPDATE_LOCATION_FAILED;
  payload: IUpdateLocationFailedPayload;
}

export type LocationActionTypes =
  | IUpdateLocationStartAction
  | IUpdateLocationSuccessAction
  | IUpdateLocationFailedAction;
