import { useCallback } from 'react';
import type { Line, Station } from '~/@types/graphql';

export const useStationNumberIndexFunc = () => {
  const func = useCallback(
    (station: Station | undefined, line?: Line | null) => {
      const stationNumbers = station?.stationNumbers;
      const lineSymbols = line?.lineSymbols;

      if (!stationNumbers?.length || !lineSymbols?.length) {
        return 0;
      }

      // lineSymbols(路線が持つ記号の一覧)と stationNumbers(駅が持つ番号の一覧)は
      // 並びも要素数も揃っていない。東武スカイツリーラインの lineSymbols は
      // [TI, TS] だが東武動物公園の stationNumbers は [TS-30] だけ、という具合に
      // ずれるため、返す位置は必ず stationNumbers 側から引く。
      const index = stationNumbers.findIndex(({ lineSymbol }) =>
        lineSymbols.some(({ symbol }) => symbol === lineSymbol)
      );

      // 路線の記号を持たない駅(直通先などデータ上の想定外)では番号ごと消さず、
      // line 未指定時と同じく先頭の番号にフォールバックする。
      return index < 0 ? 0 : index;
    },
    []
  );

  return func;
};
