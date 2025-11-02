import isPointWithinRadius from 'geolib/es/isPointWithinRadius';
import { useAtomValue } from 'jotai';
import { useEffect, useState } from 'react';
import type { Station } from '~/@types/graphql';
import stationState from '~/store/atoms/station';
import { useLocationStore } from './useLocationStore';

export const useInRadiusStation = (radius: number) => {
  const { stations, station } = useAtomValue(stationState);

  const locationState = useLocationStore();
  const latitude = locationState?.location?.coords.latitude;
  const longitude = locationState?.location?.coords.longitude;

  const [latestMatchedStation, setLatestMatchedStation] =
    useState<Station | null>(station);

  useEffect(() => {
    if (latitude == null || longitude == null) {
      return;
    }

    const matchedStation = stations.find(
      (s) =>
        s.latitude != null &&
        s.longitude != null &&
        isPointWithinRadius(
          { latitude, longitude },
          { latitude: s.latitude as number, longitude: s.longitude as number },
          radius
        )
    );

    if (matchedStation) {
      setLatestMatchedStation(matchedStation);
    }
  }, [latitude, longitude, stations, radius]);

  return latestMatchedStation;
};
