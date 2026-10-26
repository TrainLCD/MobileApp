import type { Station } from '~/@types/graphql';

export type JunctionDisplay = readonly [Station, Station];

// 重複駅を除く前の隣接データだけを使う。乗換可能なだけの路線や、
// 周回して再登場した同じ駅を直通境界として扱わない。
export const buildJunctionDisplays = (
  stations: readonly (Station | null | undefined)[],
  reverse: boolean
): Map<Station, JunctionDisplay> => {
  const ordered = stations.filter((s): s is Station => !!s);
  if (reverse) ordered.reverse();
  const result = new Map<Station, JunctionDisplay>();
  for (let i = 1; i < ordered.length; i++) {
    const before = ordered[i - 1];
    const after = ordered[i];
    if (
      before.groupId == null ||
      before.groupId !== after.groupId ||
      before.line?.id == null ||
      after.line?.id == null ||
      before.line.id === after.line.id
    )
      continue;
    const pair = [before, after] as const;
    // 既存の重複除去がどちらを残しても、同じ進行方向の組を参照する。
    result.set(before, pair);
    result.set(after, pair);
  }
  return result;
};
