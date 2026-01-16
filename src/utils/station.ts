import type { Line, Station } from '~/@types/graphql';
import { isJapanese } from '~/translation';
import { getIsLocal } from './trainTypeString';

export const getStationPrimaryCode = (
  from: Station | null,
  to: Station | null
): string => {
  if (
    getIsLocal(from?.trainType ?? null) &&
    getIsLocal(to?.trainType ?? null)
  ) {
    return from?.stationNumbers?.[0]?.stationNumber ?? '';
  }

  return `${from?.stationNumbers?.[0]?.stationNumber ?? ''} ${isJapanese ? (from?.trainType?.name ?? '') : (from?.trainType?.nameRoman ?? '')}`.trim();
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
