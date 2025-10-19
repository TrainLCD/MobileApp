import getDistance from 'geolib/es/getPreciseDistance';
import { useMemo } from 'react';
import { APPROACHING_MAX_THRESHOLD, ARRIVED_MAX_THRESHOLD } from '../constants';
import { useCurrentStation } from './useCurrentStation';
import { useNextStation } from './useNextStation';

export const useThreshold = () => {
  const currentStation = useCurrentStation(true);
  const nextStation = useNextStation(false);

  const betweenDistance = useMemo(() => {
    if (
      !currentStation ||
      !nextStation ||
      currentStation.latitude === undefined ||
      currentStation.longitude === undefined ||
      nextStation.latitude === undefined ||
      nextStation.longitude === undefined
    ) {
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

    const threshold = betweenDistance / 4;
    if (threshold > ARRIVED_MAX_THRESHOLD) {
      return ARRIVED_MAX_THRESHOLD;
    }

    return threshold;
  }, [betweenDistance]);

  return { approachingThreshold, arrivedThreshold };
};
