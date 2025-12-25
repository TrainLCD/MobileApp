import { useCallback } from 'react';
import type { Line, Station } from '~/@types/graphql';

export const useStationNumberIndexFunc = () => {
  const func = useCallback(
    (station: Station | undefined, line?: Line | null) => {
      return (
        line?.lineSymbols?.findIndex(({ symbol }) =>
          station?.stationNumbers?.some(
            ({ lineSymbol }) => symbol === lineSymbol
          )
        ) ?? 0
      );
    },
    []
  );

  return func;
};
