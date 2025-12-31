import findNearest from 'geolib/es/findNearest';
import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import type { Station } from '~/@types/graphql';
import { locationAtom } from '~/store/atoms/location';
import stationState from '../store/atoms/station';
import { useCurrentStation } from './useCurrentStation';
import { useNextStation } from './useNextStation';

export const useNearestStation = (): Station | undefined => {
  const location = useAtomValue(locationAtom);
  const latitude = location?.coords.latitude;
  const longitude = location?.coords.longitude;
  const { stations } = useAtomValue(stationState);
  const currentStation = useCurrentStation(false);
  const nextStation = useNextStation(false);

  const nearestStation = useMemo<Station | undefined>(() => {
    if (latitude == null || longitude == null) {
      return undefined;
    }

    const validStations = stations.filter(
      (s) => s.latitude != null && s.longitude != null
    );

    const nearestCoordinates = validStations.length
      ? (findNearest(
          {
            latitude,
            longitude,
          },
          validStations.map((sta) => ({
            latitude: sta.latitude as number,
            longitude: sta.longitude as number,
          }))
        ) as { latitude: number; longitude: number })
      : undefined;

    if (!nearestCoordinates) {
      return undefined;
    }

    const nearestStations = validStations.filter(
      (sta) =>
        sta.latitude === nearestCoordinates.latitude &&
        sta.longitude === nearestCoordinates.longitude
    );

    return (
      nearestStations.find(
        (s) => s.id === currentStation?.id || s.id === nextStation?.id
      ) ?? nearestStations[0]
    );
  }, [latitude, longitude, stations, currentStation, nextStation]);

  return nearestStation;
};
