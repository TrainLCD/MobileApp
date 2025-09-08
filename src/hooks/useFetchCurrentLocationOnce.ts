import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocationStore } from './useLocationStore';

type FetchFn = (
  useLastKnown?: boolean,
  timeoutMs?: number
) => Promise<Location.LocationObject>;

export const useFetchCurrentLocationOnce = () => {
  const lastKnownLocation = useLocationStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchCurrentLocation: FetchFn = useCallback(
    async (useLastKnown = false, timeoutMs = 3500) => {
      if (useLastKnown && lastKnownLocation) {
        return lastKnownLocation;
      }
      if (isMountedRef.current) setLoading(true);
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
        if (isMountedRef.current) setLoading(false);
        return pos;
      } catch (err) {
        // Fallback to last known if available
        if (lastKnownLocation) {
          if (isMountedRef.current) setLoading(false);
          return lastKnownLocation;
        }
        if (isMountedRef.current) setLoading(false);
        if (isMountedRef.current) setError(err as Error);
        return Promise.reject(err);
      }
    },
    [lastKnownLocation]
  );

  return { fetchCurrentLocation, loading, error };
};
