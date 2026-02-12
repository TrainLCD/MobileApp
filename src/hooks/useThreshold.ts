import getDistance from 'geolib/es/getPreciseDistance';
import { useMemo } from 'react';
import type { Station } from '~/@types/graphql';
import {
  APPROACHING_MAX_THRESHOLD,
  APPROACHING_MIN_THRESHOLD,
  ARRIVED_MAX_THRESHOLD,
  ARRIVED_MIN_THRESHOLD,
} from '../constants';
import { useCurrentStation } from './useCurrentStation';
import { useNextStation } from './useNextStation';

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const useThreshold = (nearestStation?: Station) => {
  const currentStation = useCurrentStation(true);
  const nextStation = useNextStation(false);

  // nearestStationが渡された場合はそちらを基準にして閾値を計算する
  const baseStation = nearestStation ?? currentStation;

  const betweenDistance = useMemo(() => {
    if (
      !baseStation ||
      !nextStation ||
      baseStation.latitude == null ||
      baseStation.longitude == null ||
      nextStation.latitude == null ||
      nextStation.longitude == null
    ) {
      return null;
    }
    return getDistance(
      {
        latitude: baseStation.latitude as number,
        longitude: baseStation.longitude as number,
      },
      {
        latitude: nextStation.latitude as number,
        longitude: nextStation.longitude as number,
      }
    );
  }, [baseStation, nextStation]);

  const approachingThreshold = useMemo(() => {
    if (!betweenDistance) {
      return APPROACHING_MAX_THRESHOLD;
    }

    return clamp(
      betweenDistance / 2,
      APPROACHING_MIN_THRESHOLD,
      APPROACHING_MAX_THRESHOLD
    );
  }, [betweenDistance]);

  const arrivedThreshold = useMemo(() => {
    if (!betweenDistance) {
      return ARRIVED_MAX_THRESHOLD;
    }

    return clamp(
      betweenDistance / 4,
      ARRIVED_MIN_THRESHOLD,
      ARRIVED_MAX_THRESHOLD
    );
  }, [betweenDistance]);

  return { approachingThreshold, arrivedThreshold };
};
