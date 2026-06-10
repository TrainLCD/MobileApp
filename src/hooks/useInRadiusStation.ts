import isPointWithinRadius from 'geolib/es/isPointWithinRadius';
import { useAtomValue } from 'jotai';
import { useEffect, useState } from 'react';
import type { Station } from '~/@types/graphql';
import { locationAtom } from '~/store/atoms/location';
import { stationAtom, stationsAtom } from '~/store/atoms/station';

export const useInRadiusStation = (radius: number) => {
  const stations = useAtomValue(stationsAtom);
  const station = useAtomValue(stationAtom);

  const location = useAtomValue(locationAtom);
  const latitude = location?.coords.latitude;
  const longitude = location?.coords.longitude;

  const [latestMatchedStation, setLatestMatchedStation] = useState<
    Station | undefined
  >(station ?? undefined);

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
