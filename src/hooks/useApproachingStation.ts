import findNearest from 'geolib/es/findNearest';
import getDistance from 'geolib/es/getPreciseDistance';
import { useAtomValue } from 'jotai';
import type { Station } from '~/@types/graphql';
import { locationAtom } from '~/store/atoms/location';
import { memoizeLastCalls, memoizeWeak } from '~/utils/memoizeLastCalls';
import stationState from '../store/atoms/station';
import getIsPass from '../utils/isPass';
import { useNextStation } from './useNextStation';

// GPS更新(約5秒間隔)ごとに走る計算のため、複数のフックインスタンス間で
// 結果(と距離計算)を共有できるようモジュールレベルでメモ化する。

// 通過駅を除いた停車駅のうち座標が有効なものだけを接近判定の対象にする。
// さらに直近で発車した(=到着済みの現在)駅を除外する。これを残すと、発車直後で
// まだ当該駅の接近圏内に留まっている間に「まもなく(発車した駅)」と誤表示される
// (例: 五反田を発車直後に「まもなく五反田」)。除外することで次の停車駅(高輪台)を
// 正しく接近駅として扱える。stationState.station は到着時に確定する現在駅のため、
// 値が古い場合でも除外対象は進行方向の後方に限られ、前方の接近対象を消すことはない。
const getValidStops = memoizeLastCalls(
  (
    stations: Station[],
    departedStationId: number | null | undefined,
    departedStationGroupId: number | null | undefined
  ): Station[] =>
    stations.filter(
      (s) =>
        !getIsPass(s) &&
        s.latitude != null &&
        s.longitude != null &&
        s.id !== departedStationId &&
        s.groupId !== departedStationGroupId
    ),
  4
);

const getStopCoordinates = memoizeWeak((validStops: Station[]) =>
  validStops.map((s) => ({
    latitude: s.latitude as number,
    longitude: s.longitude as number,
  }))
);

// 現在地に最も近い停車駅
const computeNearestStop = memoizeLastCalls(
  (
    validStops: Station[],
    stopCoordinates: { latitude: number; longitude: number }[],
    latitude: number | undefined,
    longitude: number | undefined
  ): Station | undefined => {
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
  },
  4
);

const resolveApproachingStation = memoizeLastCalls(
  (
    latitude: number | undefined,
    longitude: number | undefined,
    nearestStop: Station | undefined,
    nextOfNearestStop: Station | undefined,
    nextOfDepartedStation: Station | undefined,
    departedStationId: number | null | undefined,
    departedStationGroupId: number | null | undefined
  ): Station | undefined => {
    const isDepartedStation = (s: Station | undefined): boolean =>
      !!s &&
      (departedStationId != null || departedStationGroupId != null) &&
      (s.id === departedStationId || s.groupId === departedStationGroupId);

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
    const resolved =
      distanceToNext < distanceBetweenStops ? nextOfNearestStop : nearestStop;

    // 発車直後、手前の区間(W–X)が次の区間(X–Y)より短いと findNearest が手前の
    // 停車駅 W を最寄りに選び、その次駅(=発車駅 X)が接近駅へ再選択されて
    // 「まもなくX(発車済み駅)」と誤表示される。発車駅へ collapse したときは
    // 本来向かっている次の停車駅(発車駅の次)へ進める。
    if (isDepartedStation(resolved)) {
      return nextOfDepartedStation ?? resolved;
    }
    return resolved;
  },
  4
);

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
  const { stations, station: departedStation } = useAtomValue(stationState);
  const latitude = location?.coords.latitude;
  const longitude = location?.coords.longitude;

  const validStops = getValidStops(
    stations,
    departedStation?.id,
    departedStation?.groupId
  );
  const stopCoordinates = getStopCoordinates(validStops);
  const nearestStop = computeNearestStop(
    validStops,
    stopCoordinates,
    latitude,
    longitude
  );

  // 最寄り停車駅を起点とした進行方向側の次の停車駅
  const nextOfNearestStop = useNextStation(true, nearestStop);
  // 発車駅を起点とした次の停車駅。発車直後に発車駅自身が接近駅へ再選択された
  // ときのフォールバック先(=本来向かっている次の停車駅)に使う。
  const nextOfDepartedStation = useNextStation(
    true,
    departedStation ?? undefined
  );

  return resolveApproachingStation(
    latitude,
    longitude,
    nearestStop,
    nextOfNearestStop,
    nextOfDepartedStation,
    departedStation?.id,
    departedStation?.groupId
  );
};
