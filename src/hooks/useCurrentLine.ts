import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import type { Line } from '~/@types/graphql';
import lineState from '../store/atoms/line';
import stationState from '../store/atoms/station';
import { useCurrentStation } from './useCurrentStation';

export const useCurrentLine = (): Line | null => {
  const { stations, selectedDirection } = useAtomValue(stationState);
  const { selectedLine } = useAtomValue(lineState);
  const currentStation = useCurrentStation();

  const actualCurrentStation = useMemo(() => {
    if (!currentStation?.groupId) {
      return undefined;
    }
    // 複数候補がある場合に INBOUND は末尾優先 (= reverse して最初に当たるもの)、
    // OUTBOUND は先頭優先という従来仕様を維持しつつ、フル配列の slice().reverse()
    // を回避するため逆方向ループで探索する。
    if (selectedDirection === 'INBOUND') {
      for (let i = stations.length - 1; i >= 0; i--) {
        const s = stations[i];
        if (s?.groupId === currentStation.groupId) {
          return s;
        }
      }
      return undefined;
    }
    for (let i = 0; i < stations.length; i++) {
      const s = stations[i];
      if (s?.groupId === currentStation.groupId) {
        return s;
      }
    }
    return undefined;
  }, [currentStation?.groupId, selectedDirection, stations]);

  // NOTE: selectedLineがnullishの時はcurrentLineもnullishであってほしい
  return (selectedLine && actualCurrentStation?.line) ?? null;
};
