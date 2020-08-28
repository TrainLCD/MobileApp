import * as Permissions from 'expo-permissions';
import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import * as Location from 'expo-location';
import { updateLocationSuccess } from '../store/actions/location';

const useAskPermissions = (): [Error] => {
  const [error, setError] = useState<Error>();
  const dispatch = useDispatch();

  useEffect(() => {
    const f = async (): Promise<void> => {
      try {
        const { status } = await Permissions.askAsync(
          Permissions.USER_FACING_NOTIFICATIONS,
          Permissions.LOCATION
        );
        if (status !== 'granted') {
          throw new Error(status);
        }
        const { granted } = await Permissions.getAsync(Permissions.LOCATION);
        if (granted) {
          const location = await Location.getCurrentPositionAsync({});
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

export default useAskPermissions;
