import findNearest from 'geolib/es/findNearest';
import { useAtomValue } from 'jotai';
import type { Station } from '~/@types/graphql';
import { locationAtom } from '~/store/atoms/location';
import { memoizeLastCalls, memoizeWeak } from '~/utils/memoizeLastCalls';
import { stationsAtom } from '../store/atoms/station';
import { useCurrentStation } from './useCurrentStation';
import { useNextStation } from './useNextStation';

// GPS更新(約5秒間隔)ごとに走る計算のため、複数のフックインスタンス間で
// 結果を共有できるようモジュールレベルでメモ化する。

// 座標が有効な駅リスト(駅リスト変更時にだけ作り直す)
const getValidStations = memoizeWeak((stations: Station[]): Station[] =>
  stations.filter((s) => s.latitude != null && s.longitude != null)
);

// findNearestへ毎回渡す座標タプルも駅リスト変更時にだけ作り直す
const getStationCoordinates = memoizeWeak((validStations: Station[]) =>
  validStations.map((sta) => ({
    latitude: sta.latitude as number,
    longitude: sta.longitude as number,
  }))
);

const computeNearestStation = memoizeLastCalls(
  (
    validStations: Station[],
    stationCoordinates: { latitude: number; longitude: number }[],
    latitude: number | undefined,
    longitude: number | undefined,
    currentStation: Station | undefined,
    nextStation: Station | undefined
  ): Station | undefined => {
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
  },
  4
);

export const useNearestStation = (): Station | undefined => {
  const location = useAtomValue(locationAtom);
  const latitude = location?.coords.latitude;
  const longitude = location?.coords.longitude;
  const stations = useAtomValue(stationsAtom);
  const currentStation = useCurrentStation(false);
  const nextStation = useNextStation(false);

  const validStations = getValidStations(stations);
  const stationCoordinates = getStationCoordinates(validStations);

  return computeNearestStation(
    validStations,
    stationCoordinates,
    latitude,
    longitude,
    currentStation,
    nextStation
  );
};
