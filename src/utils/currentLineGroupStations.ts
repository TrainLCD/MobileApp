import type { Station } from '~/@types/graphql';

type LineGroupRange = { groupId: number | null; start: number; end: number };

/**
 * 駅リストを、停車駅の trainType.groupId が同じ値で続く範囲に分ける。
 * 通過駅(trainType が null)は直前の範囲に含める。
 *
 * 経路検索の乗換経路は、区間ごとの系統の駅をつないで 1 本の駅リストにしている
 * (乗換駅は前後の区間の路線の駅として 2 回並ぶ)。1 系統だけの駅リスト
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
 * 乗換駅は前の区間の降車駅と次の区間の乗車駅として 2 回並ぶので、それぞれの路線の駅を
 * 渡す。系統に無い乗降駅は API が同じ駅グループの駅で引き当てる(StationAPI#1687)。
 * 前後の区間で乗換駅が同じ駅(同じ路線の上で種別だけを乗り換える)なら、concatLegStations は
 * 前の区間の駅として 1 回だけ並べるので、その駅を両方の区間に渡す。
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
  // 1 回しか並ばない乗換駅。次の区間の乗車駅にもこの駅を渡す
  let sharedTransfer: Station | null = null;
  for (const [index, range] of ranges.entries()) {
    const next = ranges[index + 1];
    const fromStationId = (sharedTransfer ?? stations[range.start])?.id;
    // 降車駅は範囲の中で最後にこの区間の種別が停まる駅。1 回しか並ばない乗換駅の後に
    // 次の区間の通過駅が続くと、通過駅は種別を持たないのでこの範囲に入るため、
    // 範囲の末尾ではなく最後の停車駅を取る
    let transferIndex = range.end;
    while (
      transferIndex > range.start &&
      stations[transferIndex]?.trainType?.groupId !== range.groupId
    ) {
      transferIndex--;
    }
    const lastStation = stations[transferIndex];
    const toStationId = lastStation?.id;
    // 次の区間の先頭が同じ駅グループなら、乗換駅は次の区間の路線の駅としても並んでいる
    sharedTransfer =
      next && lastStation?.groupId !== stations[next.start]?.groupId
        ? lastStation
        : null;
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
 * 2 回現れることがある。シミュレーションが使う駅リスト(dropEitherJunctionStation で
 * 接続駅を 1 つにまとめたもの)はどちらも 1 度だけ持つので、segments を駅グループで
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
