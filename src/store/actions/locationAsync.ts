import * as Location from 'expo-location';
import * as Permissions from 'expo-permissions';
import { Action } from 'redux';
import { ThunkAction } from 'redux-thunk';

import { AppState } from '../';
import { getArrivedThreshold } from '../../constants';
import { LineType } from '../../models/StationAPI';
import { updateBadAccuracy, updateLocationFailed, updateLocationSuccess } from './location';
import { fetchStationStart } from './station';

export const ERR_LOCATION_REJECTED = 'ERR_LOCATION_REJECTED';

const askPermission = async () => {
  const { status } = await Permissions.askAsync(Permissions.LOCATION);
  if (status !== 'granted') {
    return Promise.reject(ERR_LOCATION_REJECTED);
  }
};

export const updateLocationAsync =
    (): ThunkAction<void, AppState, null, Action<string>> => async (dispatch, getState) => {
  dispatch(fetchStationStart());
  try {
    await askPermission();
    await Location.watchPositionAsync({
      enableHighAccuracy: true,
      accuracy: Location.Accuracy.BestForNavigation,
    }, (data) => {
      dispatch(updateLocationSuccess(data));
      const selectedLine = getState().line.selectedLine;
      const selectedLineType = selectedLine ? selectedLine.lineType : LineType.Normal;
      const maximumAccuracy = getArrivedThreshold(selectedLineType);
      if (data.coords.accuracy > maximumAccuracy) {
        dispatch(updateBadAccuracy(true));
      } else {
        dispatch(updateBadAccuracy(false));
      }
    });
  } catch (e) {
    dispatch(updateLocationFailed(e));
  }
};
