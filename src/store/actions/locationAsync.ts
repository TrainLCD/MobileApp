import * as Location from 'expo-location';
import * as Permissions from 'expo-permissions';
import { Action } from 'redux';
import { ThunkAction } from 'redux-thunk';

import { AppState } from '../';
import { updateLocationFailed, updateLocationSuccess } from './location';
import { fetchStationStart } from './station';

export const ERR_LOCATION_REJECTED = 'ERR_LOCATION_REJECTED';

const askPermission = async () => {
  const { status } = await Permissions.askAsync(Permissions.LOCATION);
  if (status !== 'granted') {
    return Promise.reject(ERR_LOCATION_REJECTED);
  }
};

export const updateLocationAsync = (): ThunkAction<void, AppState, null, Action<string>> => async (dispatch) => {
  dispatch(fetchStationStart());
  try {
    await askPermission();
    Location.watchPositionAsync({}, (data) => {
      dispatch(updateLocationSuccess(data));
    });
  } catch (e) {
    dispatch(updateLocationFailed(e));
  }
};
