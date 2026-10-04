import getDistance from 'geolib/es/getPreciseDistance';
import type { Station } from '~/@types/graphql';
import { ARRIVED_MAX_THRESHOLD } from '~/constants';
import { getAccuracyBonus } from './accuracyBonus';
import getIsPass from './isPass';

// 通過したとみなすために、通過駅から最低限離れていなければならない距離(m)。
// 到着圏が取りうる最大の半径(ARRIVED_MAX_THRESHOLD + 精度補正の上限)より外に置く。
// その内側では通常の到着判定がまだ通過駅を拾える。また駅の手前と奥の区別がつかない
// (カーブ上で次区間の方が近く見える)のも駅のごく近くに限られる。
const PASSED_STATION_MIN_DISTANCE =
  ARRIVED_MAX_THRESHOLD + getAccuracyBonus(Number.MAX_VALUE);

type Coordinates = { latitude: number; longitude: number };

const toCoordinates = (s: Station | undefined): Coordinates | null =>
  s?.latitude != null && s.longitude != null
    ? { latitude: s.latitude, longitude: s.longitude }
    : null;

/**
 * 現在駅より先にある通過駅のうち、現在地がすでに通り過ぎたものを返す。
 *
 * 現在駅(stationState.station)は、最寄り駅の到着圏(半径200m前後)に測位が入ったときにしか
 * 進まない。高速で通過する駅では到着圏を横切る時間が数秒しかなく、背景で測位がまとめて
 * 届く間隔(約10秒)より短いため、通過駅を取りこぼして現在駅が後方に取り残される。
 * 取り残されると次駅・駅間の閾値・路線図上の現在位置が揃ってずれたままになる。
 *
 * 現在地が載っている区間を、進行方向に並んだ駅間のうち「両端までの距離の和と駅間距離の
 * 差」が最小のものとして選ぶ。その区間の始点が現在駅より先なら、始点を通過したとみなす。
 *
 * 現在駅の先に続く通過駅の区間だけを候補にし、停車駅は飛び越えない。停車駅は停車中に
 * 測位が届き続けるので到着判定で拾えるはずで、拾えていないなら測位の側を疑う方が安全。
 * 停車駅へ進めると到着通知やETAの基準駅まで動いてしまう。
 *
 * @param orderedStations 進行方向順に並んだ駅(ループ線は対象外)
 */
export const findPassedStation = (
  orderedStations: Station[],
  currentStation: Station | null | undefined,
  latitude: number | null | undefined,
  longitude: number | null | undefined,
  accuracy: number | null | undefined
): Station | undefined => {
  if (!currentStation || latitude == null || longitude == null) {
    return undefined;
  }

  const idMatchIndex = orderedStations.findIndex(
    (s) => s.id === currentStation.id
  );
  const currentIndex =
    idMatchIndex !== -1
      ? idMatchIndex
      : orderedStations.findIndex((s) => s.groupId === currentStation.groupId);
  if (currentIndex === -1) {
    return undefined;
  }

  const current: Coordinates = { latitude, longitude };
  let bestIndex = -1;
  let bestExcess = Number.POSITIVE_INFINITY;

  for (let i = currentIndex; i < orderedStations.length - 1; i++) {
    const start = orderedStations[i];
    // 現在駅より先は、通過駅が続く間だけを候補にする
    if (i > currentIndex && !getIsPass(start)) {
      break;
    }
    const startCoordinates = toCoordinates(start);
    const endCoordinates = toCoordinates(orderedStations[i + 1]);
    if (!startCoordinates || !endCoordinates) {
      continue;
    }
    const excess =
      getDistance(current, startCoordinates) +
      getDistance(current, endCoordinates) -
      getDistance(startCoordinates, endCoordinates);
    if (excess < bestExcess) {
      bestExcess = excess;
      bestIndex = i;
    }
  }

  if (bestIndex <= currentIndex) {
    return undefined;
  }

  const passed = orderedStations[bestIndex];
  const passedCoordinates = toCoordinates(passed);
  const nextCoordinates = toCoordinates(orderedStations[bestIndex + 1]);
  if (!passed || !passedCoordinates || !nextCoordinates) {
    return undefined;
  }

  // 測位の誤差ぶんは手前にいる可能性があるとみなし、誤差を差し引いても
  // 通過駅の到着圏の外で、かつ通過駅より次の駅に近い場合だけ通過を確定する
  const uncertainty =
    accuracy != null && Number.isFinite(accuracy) && accuracy > 0
      ? accuracy
      : 0;
  const distanceFromPassed = getDistance(current, passedCoordinates);
  const distanceToNext = getDistance(current, nextCoordinates);
  const sectionDistance = getDistance(passedCoordinates, nextCoordinates);
  if (distanceFromPassed - uncertainty < PASSED_STATION_MIN_DISTANCE) {
    return undefined;
  }
  if (distanceToNext + uncertainty >= sectionDistance) {
    return undefined;
  }

  return passed;
};
