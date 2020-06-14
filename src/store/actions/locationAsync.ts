import * as Location from 'expo-location';
import * as Permissions from 'expo-permissions';
import { Action } from 'redux';
import { ThunkAction } from 'redux-thunk';

import { TrainLCDAppState } from '..';
import { getArrivedThreshold } from '../../constants';
import { LineType } from '../../models/StationAPI';
import {
  updateBadAccuracy,
  updateLocationFailed,
  updateLocationSuccess,
} from './location';
import { fetchStationStart } from './station';

export const ERR_LOCATION_REJECTED = 'ERR_LOCATION_REJECTED';

const askPermission = async (): Promise<void> => {
  const { status } = await Permissions.askAsync(Permissions.LOCATION);
  if (status !== 'granted') {
    return Promise.reject(ERR_LOCATION_REJECTED);
  }
  return Location.enableNetworkProviderAsync();
};

const options = {
  enableHighAccuracy: true,
};

export const updateLocationAsync = (): ThunkAction<
  void,
  TrainLCDAppState,
  null,
  Action<string>
> => async (dispatch, getState): Promise<void> => {
  dispatch(fetchStationStart());
  try {
    await askPermission();
    Location.watchPositionAsync(options, (data) => {
      dispatch(updateLocationSuccess(data));
      const { selectedLine } = getState().line;
      const maximumAccuracy = getArrivedThreshold(
        selectedLine ? selectedLine.lineType : LineType.Normal
      );
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
