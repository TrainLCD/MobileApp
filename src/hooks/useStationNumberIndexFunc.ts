import { useCallback } from 'react';
import type { Line, Station } from '~/gen/proto/stationapi_pb';

export const useStationNumberIndexFunc = () => {
  const func = useCallback((station: Station | null, line?: Line) => {
    return (
      line?.lineSymbols?.findIndex(({ symbol }) =>
        station?.stationNumbers?.some(({ lineSymbol }) => symbol === lineSymbol)
      ) ?? 0
    );
  }, []);

  return func;
};
