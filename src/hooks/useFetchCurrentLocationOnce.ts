import * as Location from 'expo-location';
import { useCallback, useState } from 'react';
import { useLocationStore } from './useLocationStore';

export const useFetchCurrentLocationOnce = () => {
  const lastKnownLocation = useLocationStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchCurrentLocation = useCallback(
    async (useLastKnown = false, timeoutMs = 3500) => {
      if (useLastKnown && lastKnownLocation) {
        return lastKnownLocation;
      }
      setLoading(true);
      const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T> =>
        new Promise((resolve, reject) => {
          const t = setTimeout(() => reject(new Error('Location timeout')), ms);
          p.then((v) => {
            clearTimeout(t);
            resolve(v);
          }).catch((e) => {
            clearTimeout(t);
            reject(e);
          });
        });
      try {
        const pos = await withTimeout(
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
            mayShowUserSettingsDialog: false,
          }),
          timeoutMs
        );
        setLoading(false);
        return pos;
      } catch (err) {
        // Fallback to last known if available
        if (lastKnownLocation) {
          setLoading(false);
          return lastKnownLocation;
        }
        setLoading(false);
        setError(err as Error);
        return Promise.reject(err);
      }
    },
    [lastKnownLocation]
  );

  return { fetchCurrentLocation, loading, error };
};
