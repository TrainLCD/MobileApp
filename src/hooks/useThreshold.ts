import { useMemo } from 'react';
import { APPROACHING_MAX_THRESHOLD, ARRIVED_MAX_THRESHOLD } from '../constants';
import { useCurrentStation } from './useCurrentStation';
import getDistance from 'geolib/es/getPreciseDistance';
import { useNextStation } from './useNextStation';

export const useThreshold = () => {
  const currentStation = useCurrentStation();
  const nextStation = useNextStation();

  const betweenDistance = useMemo(() => {
    if (!currentStation || !nextStation) {
      return null;
    }
    return getDistance(
      {
        latitude: currentStation.latitude,
        longitude: currentStation.longitude,
      },
      { latitude: nextStation.latitude, longitude: nextStation.longitude }
    );
  }, [currentStation, nextStation]);

  const approachingThreshold = useMemo(() => {
    if (!betweenDistance) {
      return APPROACHING_MAX_THRESHOLD;
    }

    const threshold = betweenDistance / 2;
    if (threshold > APPROACHING_MAX_THRESHOLD) {
      return APPROACHING_MAX_THRESHOLD;
    }

    return threshold;
  }, [betweenDistance]);

  const arrivedThreshold = useMemo(() => {
    if (!betweenDistance) {
      return ARRIVED_MAX_THRESHOLD;
    }

    const threshold = betweenDistance / 5;
    if (threshold > ARRIVED_MAX_THRESHOLD) {
      return ARRIVED_MAX_THRESHOLD;
    }

    return threshold;
  }, [betweenDistance]);

  return { approachingThreshold, arrivedThreshold };
};
