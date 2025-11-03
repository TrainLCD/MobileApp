import getDistance from 'geolib/es/getDistance';
import { useMemo } from 'react';
import { useLocationStore } from './useLocationStore';
import { useNextStation } from './useNextStation';

export const useDistanceToNextStation = () => {
  const latitude = useLocationStore(
    (state) => state?.location?.coords.latitude
  );
  const longitude = useLocationStore(
    (state) => state?.location?.coords.longitude
  );
  const nextStation = useNextStation();

  const distanceToNextStation = useMemo(
    () =>
      latitude &&
      longitude &&
      nextStation?.latitude != null &&
      nextStation?.longitude != null
        ? getDistance(
            { latitude, longitude },
            {
              latitude: nextStation.latitude,
              longitude: nextStation.longitude,
            }
          ).toLocaleString()
        : 0,
    [latitude, longitude, nextStation]
  );

  return distanceToNextStation;
};
