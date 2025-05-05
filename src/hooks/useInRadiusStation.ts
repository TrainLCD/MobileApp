import type { Station } from 'gen/proto/stationapi_pb';
import isPointWithinRadius from 'geolib/es/isPointWithinRadius';
import { useEffect, useState } from 'react';
import { useRecoilValue } from 'recoil';
import stationState from '~/store/atoms/station';
import { useLocationStore } from './useLocationStore';

export const useInRadiusStation = (radius: number) => {
  const { stations, station } = useRecoilValue(stationState);

  const locationState = useLocationStore();
  const latitude = locationState?.coords.latitude;
  const longitude = locationState?.coords.longitude;

  const [latestMatchedStation, setLatestMatchedStation] =
    useState<Station | null>(station);

  useEffect(() => {
    if (!latitude || !longitude) {
      return;
    }

    const matchedStation = stations.find((s) =>
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
