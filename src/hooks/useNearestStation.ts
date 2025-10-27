import findNearest from 'geolib/es/findNearest';
import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import type { Station } from '~/@types/graphql';
import stationState from '../store/atoms/station';
import { useCurrentStation } from './useCurrentStation';
import { useLocationStore } from './useLocationStore';
import { useNextStation } from './useNextStation';

export const useNearestStation = (): Station | null => {
  const latitude = useLocationStore((state) => state?.coords.latitude);
  const longitude = useLocationStore((state) => state?.coords.longitude);
  const { stations } = useAtomValue(stationState);
  const currentStation = useCurrentStation(false);
  const nextStation = useNextStation(false);

  const nearestStation = useMemo<Station | null>(() => {
    if (latitude == null || longitude == null) {
      return null;
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
      : null;

    if (!nearestCoordinates) {
      return null;
    }

    const nearestStations = validStations.filter(
      (sta) =>
        sta.latitude === nearestCoordinates.latitude &&
        sta.longitude === nearestCoordinates.longitude
    );

    return (
      nearestStations.find(
        (s) => s.id === currentStation?.id || s.id === nextStation?.id
      ) ??
      nearestStations[0] ??
      null
    );
  }, [latitude, longitude, stations, currentStation, nextStation]);

  return nearestStation;
};
