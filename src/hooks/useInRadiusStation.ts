import isPointWithinRadius from 'geolib/es/isPointWithinRadius';
import { useAtomValue } from 'jotai';
import { useEffect, useState } from 'react';
import type { Station } from '~/@types/graphql';
import stationState from '~/store/atoms/station';
import { useLocationStore } from './useLocationStore';

export const useInRadiusStation = (radius: number) => {
  const { stations, station } = useAtomValue(stationState);

  const locationState = useLocationStore();
  const latitude = locationState?.coords.latitude;
  const longitude = locationState?.coords.longitude;

  const [latestMatchedStation, setLatestMatchedStation] =
    useState<Station | null>(station);

  useEffect(() => {
    if (!latitude || !longitude) {
      return;
    }

    const matchedStation = stations.find(
      (s) =>
        s.latitude !== undefined &&
        s.longitude !== undefined &&
        isPointWithinRadius(
          { latitude, longitude },
          { latitude: s.latitude, longitude: s.longitude },
          radius
        )
    );

    if (matchedStation) {
      setLatestMatchedStation(matchedStation);
    }
  }, [latitude, longitude, stations, radius]);

  return latestMatchedStation;
};
