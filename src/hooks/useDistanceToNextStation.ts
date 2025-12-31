import getDistance from 'geolib/es/getDistance';
import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import { locationAtom } from '~/store/atoms/location';
import { useNextStation } from './useNextStation';

export const useDistanceToNextStation = () => {
  const location = useAtomValue(locationAtom);
  const latitude = location?.coords.latitude;
  const longitude = location?.coords.longitude;
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
