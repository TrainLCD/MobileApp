import { useRecoilValue } from 'recoil';
import { useEffect, useState } from 'react';
import stationState from '~/store/atoms/station';
import type { Station } from 'gen/proto/stationapi_pb';
import { useLocationStore } from './useLocationStore';
import isPointWithinRadius from 'geolib/es/isPointWithinRadius';

export const useInRadiusStation = (radius: number) => {
  const { stations, station } = useRecoilValue(stationState);

  const latitude = useLocationStore()?.coords.latitude;
  const longitude = useLocationStore()?.coords.longitude;

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
