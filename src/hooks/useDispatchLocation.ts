import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import * as Permissions from 'expo-permissions';
import { useSetRecoilState } from 'recoil';
import locationState from '../store/atoms/location';

const useDispatchLocation = (): [Error] => {
  const [error, setError] = useState<Error>();
  const setLocation = useSetRecoilState(locationState);

  useEffect(() => {
    const f = async (): Promise<void> => {
      try {
        const { granted } = await Permissions.getAsync(Permissions.LOCATION);
        if (granted) {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          setLocation((prev) => ({
            ...prev,
            location,
          }));
        }
      } catch (e) {
        setError(e);
      }
    };
    f();
  }, [setLocation]);
  return [error];
};

export default useDispatchLocation;
