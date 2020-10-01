import * as Permissions from 'expo-permissions';
import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import * as Location from 'expo-location';
import { updateLocationSuccess } from '../store/actions/location';

const useDispatchLocation = (): [Error] => {
  const [error, setError] = useState<Error>();
  const dispatch = useDispatch();

  useEffect(() => {
    const f = async (): Promise<void> => {
      try {
        const { granted } = await Permissions.askAsync(
          Permissions.USER_FACING_NOTIFICATIONS,
          Permissions.LOCATION
        );
        if (granted) {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          dispatch(updateLocationSuccess(location));
        }
      } catch (e) {
        setError(e);
      }
    };
    f();
  }, [dispatch]);
  return [error];
};

export default useDispatchLocation;
