import { useMemo } from 'react';
import { APPROACHING_MAX_THRESHOLD, ARRIVED_MAX_THRESHOLD } from '../constants';
import { useDistanceToNextStation } from './useDistanceToNextStation';

export const useThreshold = () => {
  const distanceToNextStation = useDistanceToNextStation();

  const approachingThreshold = useMemo(() => {
    if (!distanceToNextStation) {
      return APPROACHING_MAX_THRESHOLD;
    }

    const threshold = distanceToNextStation / 2;
    if (threshold > APPROACHING_MAX_THRESHOLD) {
      return APPROACHING_MAX_THRESHOLD;
    }

    return threshold;
  }, [distanceToNextStation]);

  const arrivedThreshold = useMemo(() => {
    if (!distanceToNextStation) {
      return ARRIVED_MAX_THRESHOLD;
    }

    const threshold = distanceToNextStation / 5;
    if (threshold > ARRIVED_MAX_THRESHOLD) {
      return ARRIVED_MAX_THRESHOLD;
    }

    return threshold;
  }, [distanceToNextStation]);

  return { approachingThreshold, arrivedThreshold };
};
