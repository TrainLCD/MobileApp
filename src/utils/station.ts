import type { Line, Station } from '~/@types/graphql';
import { isJapanese } from '~/translation';

export const getStationPrimaryCode = (
  s: Station | null | undefined
): string | null => s?.stationNumbers?.[0]?.stationNumber ?? null;

export const getStationName = (s: Station | null | undefined): string | null =>
  (isJapanese ? s?.name : s?.nameRoman) ?? null;

export const getStationLineId = (
  s: Station | null | undefined
): number | undefined => (s?.line as Line | undefined)?.id ?? undefined;

export const isSameStationShallow = (
  a: Station | null | undefined,
  b: Station | null | undefined
): boolean => {
  if (!!a !== !!b) return false;
  return (
    a?.id === b?.id &&
    getStationLineId(a) === getStationLineId(b) &&
    a?.name === b?.name &&
    a?.nameRoman === b?.nameRoman
  );
};
