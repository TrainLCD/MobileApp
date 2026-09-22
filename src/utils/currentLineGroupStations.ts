import type { Station } from '~/@types/graphql';

export type LineGroupStations = {
  /** 範囲の駅が属する系統。駅に種別が無い駅リストでは null */
  groupId: number | null;
  stations: Station[];
};

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
 * 駅リストのうち、現在駅と同じ系統が続く範囲を返す。
 * 系統ごとの API は 1 系統の中でしか答えられないため、乗換経路では現在乗っている
 * 区間の範囲だけを渡す。1 系統だけの駅リストでは駅リストをそのまま返す
 * @param stations 乗車中の駅リスト
 * @param currentStation 現在駅
 * @returns 現在駅を含む範囲の駅と系統
 */
export const getCurrentLineGroupStations = (
  stations: Station[],
  currentStation: Station | null | undefined
): LineGroupStations => {
  const ranges = getLineGroupRanges(stations);
  if (ranges.length <= 1) {
    return { groupId: ranges[0]?.groupId ?? null, stations };
  }

  const byId = stations.findIndex((s) => s.id === currentStation?.id);
  const currentIndex =
    byId !== -1
      ? byId
      : stations.findIndex((s) => s.groupId === currentStation?.groupId);
  const range =
    ranges.find((r) => currentIndex >= r.start && currentIndex <= r.end) ??
    ranges[0];

  return {
    groupId: range.groupId,
    stations: stations.slice(range.start, range.end + 1),
  };
};

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
 * 駅リストの並び(= 進行順)で区間を並べるので、駅リストの先頭から末尾へ進むときだけ使える
 * @param stations 乗車中の駅リスト
 * @returns 区間の並び。1 系統だけの駅リストや、区間の系統を引けない場合は null
 */
export const buildRouteLegInputs = (
  stations: Station[]
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
  return legs;
};

/**
 * legs を渡した trainRoute の segments を駅リストの並びに揃える。
 *
 * API は区間ごとの駅をそのまま連結して返すので、乗換駅は前の区間の降車駅と次の区間の
 * 乗車駅の 2 回現れる。駅リストは乗換駅を 1 度だけ持つので、次の区間の乗車駅の分
 * (距離 0 の区間の起点)を捨て、前の区間の列車で乗換駅に着くまでの分を残す
 * @param segments trainRoute の segments(区間ごとに連結されたもの)
 * @param stations 乗車中の駅リスト
 * @returns 駅リストと同じ長さの segments。長さが合わなければ null
 */
export const alignConnectedTrainRouteSegments = <T>(
  segments: T[],
  stations: Station[]
): T[] | null => {
  const ranges = getLineGroupRanges(stations);
  const dropIndices = new Set<number>();
  let offset = 0;
  ranges.forEach((range, index) => {
    if (index > 0) dropIndices.add(offset);
    // 最後以外の区間は、駅リストには無い降車駅(乗換駅)の分だけ API 側が長い
    offset += range.end - range.start + 1 + (index < ranges.length - 1 ? 1 : 0);
  });
  if (offset !== segments.length) return null;

  return segments.filter((_, index) => !dropIndices.has(index));
};
