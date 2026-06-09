import findNearest from 'geolib/es/findNearest';
import getDistance from 'geolib/es/getPreciseDistance';
import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import type { Station } from '~/@types/graphql';
import { locationAtom } from '~/store/atoms/location';
import stationState from '../store/atoms/station';
import getIsPass from '../utils/isPass';
import { useNextStation } from './useNextStation';

/**
 * GPSの現在地を起点に「実際に接近している次の停車駅」を求める。
 *
 * useNextStation は最後に到着した駅(stationState.station)を起点にするため、
 * 到着判定の取りこぼし等で起点が古くなると次駅もずれてしまう。
 * 本フックは現在地から最も近い停車駅を起点に進行方向の次駅を求めることで、
 * 「まもなく」表示・接近判定の双方を現在地に追従させ、ずれを自己修復する。
 */
export const useApproachingStation = (): Station | undefined => {
  const location = useAtomValue(locationAtom);
  const { stations } = useAtomValue(stationState);
  const latitude = location?.coords.latitude;
  const longitude = location?.coords.longitude;

  // 通過駅を除いた停車駅のうち座標が有効なものだけを接近判定の対象にする
  const validStops = useMemo(
    () =>
      stations.filter(
        (s) => !getIsPass(s) && s.latitude != null && s.longitude != null
      ),
    [stations]
  );

  const stopCoordinates = useMemo(
    () =>
      validStops.map((s) => ({
        latitude: s.latitude as number,
        longitude: s.longitude as number,
      })),
    [validStops]
  );

  // 現在地に最も近い停車駅
  const nearestStop = useMemo<Station | undefined>(() => {
    if (latitude == null || longitude == null || stopCoordinates.length === 0) {
      return undefined;
    }

    const nearest = findNearest({ latitude, longitude }, stopCoordinates) as
      | { latitude: number; longitude: number }
      | undefined;
    if (!nearest) {
      return undefined;
    }

    return validStops.find(
      (s) =>
        s.latitude === nearest.latitude && s.longitude === nearest.longitude
    );
  }, [latitude, longitude, stopCoordinates, validStops]);

  // 最寄り停車駅を起点とした進行方向側の次の停車駅
  const nextOfNearestStop = useNextStation(true, nearestStop);

  return useMemo<Station | undefined>(() => {
    if (!nearestStop) {
      return undefined;
    }

    if (
      !nextOfNearestStop ||
      latitude == null ||
      longitude == null ||
      nextOfNearestStop.latitude == null ||
      nextOfNearestStop.longitude == null ||
      nearestStop.latitude == null ||
      nearestStop.longitude == null
    ) {
      return nearestStop;
    }

    const current = { latitude, longitude };
    const nextCoordinates = {
      latitude: nextOfNearestStop.latitude as number,
      longitude: nextOfNearestStop.longitude as number,
    };

    const distanceToNext = getDistance(current, nextCoordinates);
    const distanceBetweenStops = getDistance(
      {
        latitude: nearestStop.latitude as number,
        longitude: nearestStop.longitude as number,
      },
      nextCoordinates
    );

    // 最寄り停車駅よりも次の停車駅へ近づいている場合は、
    // 既に最寄り停車駅を通過したとみなして次の停車駅を接近駅として扱う。
    return distanceToNext < distanceBetweenStops
      ? nextOfNearestStop
      : nearestStop;
  }, [latitude, longitude, nearestStop, nextOfNearestStop]);
};
