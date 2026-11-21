import type { Station } from '~/@types/graphql';
import { translate } from '~/translation';

export const getBusPlatformCode = (
  stops: readonly Station[],
  index: number
): string | undefined => {
  const stop = stops[index];
  const code = stop?.platformCode;

  // 同じ停留所名が続くときだけ、のりば番号で区別する。
  if (!stop?.name || !code || !/^\d+$/.test(code)) return undefined;

  return [stops[index - 1], stops[index + 1]].some(
    (neighbor) => neighbor?.name === stop.name && neighbor.platformCode !== code
  )
    ? code
    : undefined;
};

export const getBusPlatformCodeForStop = (
  stops: readonly Station[],
  stop: Station
): string | undefined =>
  stop.id != null && stop.platformCode
    ? getBusPlatformCode(
        stops,
        stops.findIndex(({ id }) => id === stop.id)
      )
    : undefined;

export const appendBusPlatform = <T extends string | null | undefined>(
  name: T,
  code: string | undefined,
  locale: 'ja' | 'en'
): string | T => {
  if (!name || !code) return name;
  const label = translate('busPlatform', { number: code, locale });
  return locale === 'en' ? `${name} ${label}` : `${name}${label}`;
};
