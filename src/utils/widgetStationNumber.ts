import type { Station } from '~/@types/graphql';

/** ウィジェットの各駅の路線に対応する番号。番号のない駅では空欄を渡します。 */
export const getWidgetStationNumber = (
  station: Station | undefined
): string => {
  const numbers = station?.stationNumbers;
  const symbols = station?.line?.lineSymbols;
  const number =
    numbers?.find(({ lineSymbol }) =>
      symbols?.some(({ symbol }) => symbol === lineSymbol)
    ) ?? numbers?.[0];
  return (number?.stationNumber ?? '')
    .trim()
    .replace(/^([A-Za-z]+)(\d+)$/, '$1-$2');
};
