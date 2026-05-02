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

  // 座標が有効な駅リストをキャッシュする
  const validStations = useMemo(
    () => stations.filter((s) => s.latitude != null && s.longitude != null),
    [stations]
  );

  // findNearestへ毎回渡す座標タプルは駅リスト変更時にだけ作り直す
  const stationCoordinates = useMemo(
    () =>
      validStations.map((sta) => ({
        latitude: sta.latitude as number,
        longitude: sta.longitude as number,
      })),
    [validStations]
  );

  const nearestStation = useMemo<Station | undefined>(() => {
    if (
      latitude == null ||
      longitude == null ||
      stationCoordinates.length === 0
    ) {
      return undefined;
    }

    const nearestCoordinates = findNearest(
      { latitude, longitude },
      stationCoordinates
    ) as { latitude: number; longitude: number } | undefined;

    if (!nearestCoordinates) {
      return undefined;
    }

    // currentStation / nextStation は到着判定で頻繁に最寄りになるため
    // validStations全体の走査前にショートサーキットして O(1) で返す
    if (
      currentStation?.latitude === nearestCoordinates.latitude &&
      currentStation?.longitude === nearestCoordinates.longitude
    ) {
      return currentStation;
    }
    if (
      nextStation?.latitude === nearestCoordinates.latitude &&
      nextStation?.longitude === nearestCoordinates.longitude
    ) {
      return nextStation;
    }

    // 同座標の駅が複数あるケースに備えて先頭一致を返す
    return validStations.find(
      (sta) =>
        sta.latitude === nearestCoordinates.latitude &&
        sta.longitude === nearestCoordinates.longitude
    );
  }, [
    latitude,
    longitude,
    validStations,
    stationCoordinates,
    currentStation,
    nextStation,
  ]);

  return nearestStation;
};
