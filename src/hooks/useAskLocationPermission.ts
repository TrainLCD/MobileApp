import * as Permissions from 'expo-permissions';
import { useState, useEffect } from 'react';

const useWatchLocation = (): [Error] => {
  const [error, setError] = useState<Error>();

  useEffect(() => {
    const f = async (): Promise<void> => {
      try {
        const { status } = await Permissions.askAsync(Permissions.LOCATION);
        if (status !== 'granted') {
          throw new Error(status);
        }
      } catch (e) {
        setError(e);
      }
    };
    f();
  }, []);
  return [error];
};

export default useWatchLocation;
