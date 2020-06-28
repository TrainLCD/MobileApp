import * as Location from 'expo-location';
import * as Permissions from 'expo-permissions';
import { Dispatch, useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { LocationActionTypes } from '../store/types/location';
import { updateLocationSuccess } from '../store/actions/location';

const useWatchLocation = (): [Error] => {
  const dispatch = useDispatch<Dispatch<LocationActionTypes>>();
  const [error, setError] = useState<Error>();

  useEffect(() => {
    const f = async (): Promise<void> => {
      try {
        const { status } = await Permissions.askAsync(Permissions.LOCATION);
        if (status !== 'granted') {
          throw new Error(status);
        }
        Location.enableNetworkProviderAsync();
        Location.watchPositionAsync(
          {
            enableHighAccuracy: true,
          },
          (data) => {
            dispatch(updateLocationSuccess(data));
          }
        );
      } catch (e) {
        setError(e);
      }
    };
    f();
  }, [dispatch]);
  return [error];
};

export default useWatchLocation;
