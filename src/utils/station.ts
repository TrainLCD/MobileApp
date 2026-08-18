import type { Line, Station } from '~/@types/graphql';
import { isJapanese } from '~/translation';

export const getStationPrimaryCode = (
  from: Station | null,
  _to: Station | null
): string => {
  return from?.stationNumbers?.[0]?.stationNumber ?? '';
};
export const getStationName = (s: Station | undefined): string =>
  (isJapanese ? s?.name : s?.nameRoman) ?? '';

export const getStationLineId = (s: Station | undefined): number | undefined =>
  (s?.line as Line | undefined)?.id ?? undefined;

/**
 * 同じ物理駅が路線ごとに別レコード(別 `id`)として返ってくるケース
 * (例: 熱海駅の 東海道線 / 東海道本線 / 伊東線)で、同じ駅が並ぶのを
 * 防ぐため、`groupId` が一致する Station を最初の出現だけ残して間引く。
 * 元の並び順(呼び出し側が意図した優先順)は保つ。`groupId` が無い駅は
 * 同一判定ができないためそのまま残す。
 */
export const dedupeStationsByGroupId = (stations: Station[]): Station[] => {
  if (stations.length <= 1) return stations;
  const seen = new Set<number>();
  const result: Station[] = [];
  for (const station of stations) {
    const groupId = station.groupId;
    if (groupId != null) {
      if (seen.has(groupId)) continue;
      seen.add(groupId);
    }
    result.push(station);
  }
  return result;
};

export const isSameStationShallow = (
  a: Station | undefined,
  b: Station | undefined
): boolean => {
  if (!!a !== !!b) return false;
  return (
    a?.id === b?.id &&
    getStationLineId(a) === getStationLineId(b) &&
    a?.name === b?.name &&
    a?.nameRoman === b?.nameRoman
  );
};
