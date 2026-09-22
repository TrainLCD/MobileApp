import type { Station } from '~/@types/graphql';

type LineGroupRange = { groupId: number | null; start: number; end: number };

/**
 * 駅リストを、停車駅の trainType.groupId が同じ値で続く範囲に分ける。
 * 通過駅(trainType が null)は直前の範囲に含める。
 *
 * 経路検索の乗換経路は、区間ごとの系統の駅をつないで 1 本の駅リストにしている
 * (乗換駅は次の区間の乗車駅として 1 度だけ持つ)。1 系統だけの駅リスト
 * (直通運転を含む従来の乗車)は範囲が 1 つになる。
 */
const getLineGroupRanges = (stations: Station[]): LineGroupRange[] => {
  const ranges: LineGroupRange[] = [];
  stations.forEach((station, index) => {
    const groupId = station.trainType?.groupId ?? null;
    const last = ranges.at(-1);
    if (!last) {
      ranges.push({ groupId, start: index, end: index });
      return;
    }
    if (groupId != null && last.groupId != null && groupId !== last.groupId) {
      ranges.push({ groupId, start: index, end: index });
      return;
    }
    last.end = index;
    // 先頭が通過駅で始まる範囲は、最初の停車駅の系統をその範囲の系統にする
    last.groupId ??= groupId;
  });
  return ranges;
};

/**
 * 駅リストが複数の系統の範囲に分かれているか(= 経路検索の乗換経路をつないだ駅リストか)。
 * 1 系統だけの駅リスト(直通運転を含む従来の乗車)では false
 * @param stations 乗車中の駅リスト
 * @returns 複数の系統の範囲に分かれていれば true
 */
export const isJoinedLineGroupStations = (stations: Station[]): boolean =>
  getLineGroupRanges(stations).length > 1;

/** estimateArrivalTimes / trainRoute の legs に渡す 1 区間 */
export type RouteLegInput = {
  lineGroupId: number;
  fromStationId: number;
  toStationId: number;
};

/**
 * 乗換経路をつないだ駅リストから、estimateArrivalTimes / trainRoute の legs を組み立てる。
 *
 * 駅リストは乗換駅を次の区間の乗車駅として持つので、前の区間の降車駅にもその乗換駅を
 * 渡す。系統に無い乗降駅は API が同じ駅グループの駅で引き当てる(StationAPI#1687)。
 * 末尾から先頭へ進むとき(オートモードが終点で折り返したときなど)は、先頭から進むときの
 * 区間を逆順にし、乗車駅と降車駅を入れ替える
 * @param stations 乗車中の駅リスト(格納順)
 * @param reversed 駅リストの末尾から先頭へ進むなら true
 * @returns 進行順の区間の並び。1 系統だけの駅リストや、区間の系統を引けない場合は null
 */
export const buildRouteLegInputs = (
  stations: Station[],
  reversed = false
): RouteLegInput[] | null => {
  const ranges = getLineGroupRanges(stations);
  if (ranges.length <= 1) return null;

  const legs: RouteLegInput[] = [];
  for (const [index, range] of ranges.entries()) {
    const next = ranges[index + 1];
    const fromStationId = stations[range.start]?.id;
    const toStationId = stations[next ? next.start : range.end]?.id;
    if (range.groupId == null || fromStationId == null || toStationId == null) {
      return null;
    }
    legs.push({ lineGroupId: range.groupId, fromStationId, toStationId });
  }
  return reversed
    ? legs.reverse().map((leg) => ({
        ...leg,
        fromStationId: leg.toStationId,
        toStationId: leg.fromStationId,
      }))
    : legs;
};

/**
 * legs を渡した trainRoute の segments を、進行順に並べた駅リストに揃える。
 *
 * API は区間ごとの駅をそのまま連結して返すので、乗換駅は前の区間の降車駅と次の区間の
 * 乗車駅の 2 回現れる。系統の中で路線が変わる駅(東海道・山陽新幹線の新大阪など)も
 * 2 回現れることがある。駅リストはどちらも 1 度だけ持つので、segments を駅グループで
 * 駅リストと突き合わせ、同じ駅グループが続く分は最初の 1 つ(その駅に着くまでの分)だけを残す。
 * 件数の推定で揃えると、区間の切り出し方が API とずれたときに位置がずれる
 * @param segments trainRoute の segments(進行順の区間ごとに連結されたもの)
 * @param stations 進行順の駅リスト(同じ駅グループが続かないもの)
 * @returns 駅リストと同じ長さの segments。突き合わせられなければ null
 */
export const alignConnectedTrainRouteSegments = <
  T extends { station?: { groupId?: number | null } | null },
>(
  segments: T[],
  stations: Station[]
): T[] | null => {
  const aligned: T[] = [];
  let cursor = 0;
  for (const station of stations) {
    const segment = segments[cursor];
    if (
      station.groupId == null ||
      segment?.station?.groupId !== station.groupId
    ) {
      return null;
    }
    aligned.push(segment);
    cursor++;
    while (segments[cursor]?.station?.groupId === station.groupId) {
      cursor++;
    }
  }
  return cursor === segments.length ? aligned : null;
};
