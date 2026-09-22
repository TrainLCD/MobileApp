import type { Station } from '~/@types/graphql';

export type LineGroupStations = {
  /** 範囲の駅が属する系統。駅に種別が無い駅リストでは null */
  groupId: number | null;
  stations: Station[];
};

/**
 * 駅リストのうち、現在駅と同じ系統が続く範囲を返す。
 *
 * 経路検索の乗換経路は、区間ごとの系統の駅をつないで 1 本の駅リストにしている。
 * 系統ごとの API(estimateArrivalTimes など)は 1 系統の中でしか答えられないため、
 * 現在乗っている区間の範囲だけを渡す必要がある。範囲は停車駅の trainType.groupId が
 * 同じ値で続く並びとし、通過駅(trainType が null)は直前の範囲に含める。
 * 1 系統だけの駅リスト(直通運転を含む従来の乗車)では駅リストをそのまま返す。
 * @param stations 乗車中の駅リスト
 * @param currentStation 現在駅
 * @returns 現在駅を含む範囲の駅と系統
 */
export const getCurrentLineGroupStations = (
  stations: Station[],
  currentStation: Station | null | undefined
): LineGroupStations => {
  const ranges: { groupId: number | null; start: number; end: number }[] = [];
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
