import findNearest from 'geolib/es/findNearest';
import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import type { Station } from '~/gen/proto/stationapi_pb';
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
    if (!latitude || !longitude) {
      return null;
    }

    const nearestCoordinates = stations.length
      ? (findNearest(
          {
            latitude,
            longitude,
          },
          stations.map((sta) => ({
            latitude: sta.latitude,
            longitude: sta.longitude,
          }))
        ) as { latitude: number; longitude: number })
      : null;

    if (!nearestCoordinates) {
      return null;
    }

    const nearestStations = stations.filter(
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
