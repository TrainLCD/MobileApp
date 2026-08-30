import { useMemo } from 'react';
import type { Line } from '~/@types/graphql';

/**
 * 乗換路線ごとに、その路線のシンボルと対応する駅ナンバリングを取り出す。
 *
 * 駅側の stationNumbers に路線のシンボルと一致するものが無い場合は、
 * シンボルを持たない駅ナンバリングと路線側の先頭シンボルを組み合わせて
 * フォールバックする(シンボル未設定の路線でもナンバリングを出すため)。
 * どちらの経路でも lineSymbolShape は 'NOOP' で埋めて型を揃える。
 */
export const useTransferStationNumbers = (lines: Line[]) =>
  useMemo(
    () =>
      lines.map((l) => {
        const stationNumberData = l.station?.stationNumbers?.find((sn) =>
          l.lineSymbols?.some((sym) => sym.symbol === sn.lineSymbol)
        );
        const lineSymbol = stationNumberData?.lineSymbol ?? '';
        const lineSymbolColor = stationNumberData?.lineSymbolColor ?? '';
        const stationNumber = stationNumberData?.stationNumber ?? '';
        const lineSymbolShape = stationNumberData?.lineSymbolShape ?? 'NOOP';

        if (!lineSymbol.length || !stationNumber.length) {
          const stationNumberWhenEmptySymbol =
            l.station?.stationNumbers?.find((sn) => !sn.lineSymbol?.length)
              ?.stationNumber ?? '';
          const lineSymbolWhenEmptySymbol = l.lineSymbols?.[0]?.symbol ?? '';
          const lineSymbolColorWhenEmptySymbol =
            l.station?.stationNumbers?.find((sn) => !sn.lineSymbol?.length)
              ?.lineSymbolColor ?? '#000000';
          const lineSymbolShapeWhenEmptySymbol =
            l.station?.stationNumbers?.find(
              (sn) => !sn.lineSymbol?.length
            )?.lineSymbolShape;

          return {
            __typename: 'StationNumber' as const,
            lineSymbol: lineSymbolWhenEmptySymbol,
            lineSymbolColor: lineSymbolColorWhenEmptySymbol,
            stationNumber: stationNumberWhenEmptySymbol,
            lineSymbolShape: lineSymbolShapeWhenEmptySymbol ?? 'NOOP',
          };
        }

        return {
          __typename: 'StationNumber' as const,
          lineSymbol,
          lineSymbolColor,
          stationNumber,
          lineSymbolShape,
        };
      }),
    [lines]
  );
