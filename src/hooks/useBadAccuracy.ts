import { useMemo } from 'react';
import { BAD_ACCURACY_THRESHOLD } from '../constants';
import { useLocationStore } from './useLocationStore';

export const useBadAccuracy = (): boolean => {
  const accuracy = useLocationStore(
    (state) => state?.location?.coords.accuracy
  );

  return useMemo(() => {
    if (!accuracy) {
      return false;
    }
    if ((accuracy || 0) > BAD_ACCURACY_THRESHOLD) {
      return true;
    }
    return false;
  }, [accuracy]);
};
