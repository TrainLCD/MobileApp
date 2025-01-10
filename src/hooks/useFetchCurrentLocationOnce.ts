import * as Location from 'expo-location';
import { useCallback, useState } from 'react';
import { useLocationStore } from './useLocationStore';

export const useFetchCurrentLocationOnce = () => {
  const lastKnownLocation = useLocationStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchCurrentLocation = useCallback(
    async (useLastKnown = false) => {
      if (useLastKnown && lastKnownLocation) {
        return lastKnownLocation;
      }
      setLoading(true);
      try {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLoading(false);
        return pos;
      } catch (err) {
        setLoading(false);
        setError(err as Error);
        return Promise.reject(err);
      }
    },
    [lastKnownLocation]
  );

  return { fetchCurrentLocation, loading, error };
};
