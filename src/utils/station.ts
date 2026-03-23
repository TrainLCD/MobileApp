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
