import getDistance from 'geolib/es/getDistance';
import { useMemo } from 'react';
import { useLocationStore } from './useLocationStore';
import { useNextStation } from './useNextStation';

export const useDistanceToNextStation = () => {
  const latitude = useLocationStore((state) => state?.coords.latitude);
  const longitude = useLocationStore((state) => state?.coords.longitude);
  const nextStation = useNextStation();

  const distanceToNextStation = useMemo(
    () =>
      latitude &&
      longitude &&
      nextStation &&
      nextStation.latitude !== undefined &&
      nextStation.longitude !== undefined
        ? getDistance(
            { latitude, longitude },
            {
              latitude: nextStation.latitude,
              longitude: nextStation.longitude,
            }
          )
        : 0,
    [latitude, longitude, nextStation]
  );

  return distanceToNextStation;
};
