import type { Station } from '~/@types/graphql';
import type { LineDirection } from '../models/Bound';

/**
 * LineBoard の先頭の駅に着いた区間の路線の色を返す。
 * 接続駅は前の路線の駅と次の路線の駅として 2 回並び、着いた後の LineBoard では
 * 先頭の接続駅が次の路線の駅に差し替わる(#7067)。進行方向の 1 つ手前に同じ駅グループの
 * 駅があれば、それが前の路線の接続駅なのでその色を返す
 * @param stations 接続駅を 2 回並べたままの経路の駅(stationsAtom)
 * @param direction 進行方向。INBOUND は配列順、OUTBOUND は配列の逆順に進む
 * @param firstStation LineBoard の先頭の駅
 * @returns 先頭の駅に着いた区間の路線の色
 */
export const getArrivingLineColor = (
  stations: Station[],
  direction: LineDirection | null,
  firstStation: Station | undefined
): string | null | undefined => {
  if (!firstStation) return undefined;
  const index = stations.findIndex((s) => s.id === firstStation.id);
  const behind =
    index === -1
      ? undefined
      : direction === 'OUTBOUND'
        ? stations[index + 1]
        : stations[index - 1];
  return behind &&
    firstStation.groupId != null &&
    behind.groupId === firstStation.groupId
    ? behind.line?.color
    : firstStation.line?.color;
};
