import { useMemo } from 'react';
import { useLocationStore } from './useLocationStore';
import { useThreshold } from './useThreshold';

export const useBadAccuracy = (): boolean => {
  const accuracy = useLocationStore((state) => state?.coords.accuracy);
  const { arrivedThreshold } = useThreshold();

  return useMemo(() => {
    if (!accuracy) {
      return false;
    }
    if ((accuracy || 0) > arrivedThreshold) {
      return true;
    }
    return false;
  }, [arrivedThreshold, accuracy]);
};
