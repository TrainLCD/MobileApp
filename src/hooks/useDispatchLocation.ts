import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { useSetRecoilState } from 'recoil';
import locationState from '../store/atoms/location';

const useDispatchLocation = (): [Error] => {
  const [error, setError] = useState<Error>();
  const setLocation = useSetRecoilState(locationState);

  useEffect(() => {
    const f = async (): Promise<void> => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        const granted = status === Location.PermissionStatus.GRANTED;
        if (granted) {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Highest,
          });
          setLocation((prev) => ({
            ...prev,
            location,
          }));
        }
      } catch (err) {
        setError(err);
      }
    };
    f();
  }, [setLocation]);
  return [error];
};

export default useDispatchLocation;
