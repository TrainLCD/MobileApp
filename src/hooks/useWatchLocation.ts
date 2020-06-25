import * as Location from 'expo-location';
import * as Permissions from 'expo-permissions';
import { useCallback, Dispatch, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { LocationActionTypes } from '../store/types/location';
import {
  updateLocationSuccess,
  updateBadAccuracy,
} from '../store/actions/location';
import { TrainLCDAppState } from '../store';
import { getArrivedThreshold } from '../constants';
import { LineType } from '../models/StationAPI';

const useWatchLocation = (): [Error] => {
  const dispatch = useDispatch<Dispatch<LocationActionTypes>>();
  const selectedLine = useSelector(
    (state: TrainLCDAppState) => state.line.selectedLine
  );
  const [error, setError] = useState<Error>();

  const askPermission = useCallback(async (): Promise<void> => {
    const { status } = await Permissions.askAsync(Permissions.LOCATION);
    if (status !== 'granted') {
      return Promise.reject(status);
    }
    return Location.enableNetworkProviderAsync();
  }, []);
  const options = {
    enableHighAccuracy: true,
  };

  useEffect(() => {
    const f = async (): Promise<void> => {
      try {
        await askPermission();
        Location.watchPositionAsync(options, (data) => {
          dispatch(updateLocationSuccess(data));
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
        setError(e);
      }
    };
    f();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return [error];
};

export default useWatchLocation;
