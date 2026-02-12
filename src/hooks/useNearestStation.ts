import findNearest from 'geolib/es/findNearest';
import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import type { Station } from '~/@types/graphql';
import { locationAtom } from '~/store/atoms/location';
import stationState from '../store/atoms/station';
import { useCurrentStation } from './useCurrentStation';
import { useNextStation } from './useNextStation';

// 現在駅のインデックスを中心に前後何駅まで探索するか
const NEARBY_STATION_RANGE = 5;

export const useNearestStation = (): Station | undefined => {
  const location = useAtomValue(locationAtom);
  const latitude = location?.coords.latitude;
  const longitude = location?.coords.longitude;
  const { stations } = useAtomValue(stationState);
  const currentStation = useCurrentStation(false);
  const nextStation = useNextStation(false);

  // 座標が有効な駅リストをキャッシュする
  const validStations = useMemo(
    () => stations.filter((s) => s.latitude != null && s.longitude != null),
    [stations]
  );

  // 現在駅の近傍のみに探索範囲を絞った候補を生成する
  // 鉄道は路線に沿って移動するため、遠い駅への到着は通常ありえない
  const candidateStations = useMemo(() => {
    if (!currentStation) {
      return validStations;
    }

    const currentIndex = validStations.findIndex(
      (s) => s.id === currentStation.id
    );
    if (currentIndex === -1) {
      return validStations;
    }

    const start = Math.max(0, currentIndex - NEARBY_STATION_RANGE);
    const end = Math.min(
      validStations.length,
      currentIndex + NEARBY_STATION_RANGE + 1
    );
    return validStations.slice(start, end);
  }, [currentStation, validStations]);

  const nearestStation = useMemo<Station | undefined>(() => {
    if (latitude == null || longitude == null) {
      return undefined;
    }

    const nearestCoordinates = candidateStations.length
      ? (findNearest(
          {
            latitude,
            longitude,
          },
          candidateStations.map((sta) => ({
            latitude: sta.latitude as number,
            longitude: sta.longitude as number,
          }))
        ) as { latitude: number; longitude: number })
      : undefined;

    if (!nearestCoordinates) {
      return undefined;
    }

    const nearestStations = candidateStations.filter(
      (sta) =>
        sta.latitude === nearestCoordinates.latitude &&
        sta.longitude === nearestCoordinates.longitude
    );

    return (
      nearestStations.find(
        (s) => s.id === currentStation?.id || s.id === nextStation?.id
      ) ?? nearestStations[0]
    );
  }, [latitude, longitude, candidateStations, currentStation, nextStation]);

  return nearestStation;
};
