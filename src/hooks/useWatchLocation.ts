import * as Location from 'expo-location';
import * as Permissions from 'expo-permissions';
import { useState, useEffect } from 'react';
import { LOCATION_TASK_NAME } from '../constants';

const useWatchLocation = (): [Error] => {
  const [error, setError] = useState<Error>();

  useEffect(() => {
    const f = async (): Promise<void> => {
      try {
        const { status } = await Permissions.askAsync(Permissions.LOCATION);
        if (status !== 'granted') {
          throw new Error(status);
        }
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.BestForNavigation,
          activityType: Location.ActivityType.AutomotiveNavigation,
        });
      } catch (e) {
        setError(e);
      }
    };
    f();
  }, []);
  return [error];
};

export default useWatchLocation;
