import { useAtomValue } from 'jotai';
import type { Line, Station } from '~/@types/graphql';
import type { LineDirection } from '../models/Bound';
import lineState from '../store/atoms/line';
import stationState from '../store/atoms/station';
import { memoizeLastCalls } from '../utils/memoizeLastCalls';
import { useCurrentStation } from './useCurrentStation';

// 本フックも多数の呼び出し元を持つため、O(n)走査をインスタンスごとのuseMemoではなく
// モジュールレベルの共有キャッシュで1回に集約する。
// 複数候補がある場合に INBOUND は末尾優先 (= reverse して最初に当たるもの)、
// OUTBOUND は先頭優先という従来仕様を維持しつつ、フル配列の slice().reverse()
// を回避するため逆方向ループで探索する。
const findActualCurrentStation = memoizeLastCalls(
  (
    stations: Station[],
    groupId: number | null | undefined,
    selectedDirection: LineDirection | null
  ): Station | undefined => {
    if (!groupId) {
      return undefined;
    }
    if (selectedDirection === 'INBOUND') {
      for (let i = stations.length - 1; i >= 0; i--) {
        const s = stations[i];
        if (s?.groupId === groupId) {
          return s;
        }
      }
      return undefined;
    }
    for (let i = 0; i < stations.length; i++) {
      const s = stations[i];
      if (s?.groupId === groupId) {
        return s;
      }
    }
    return undefined;
  }
);

export const useCurrentLine = (): Line | null => {
  const { stations, selectedDirection } = useAtomValue(stationState);
  const { selectedLine } = useAtomValue(lineState);
  const currentStation = useCurrentStation();

  const actualCurrentStation = findActualCurrentStation(
    stations,
    currentStation?.groupId,
    selectedDirection ?? null
  );

  // NOTE: selectedLineがnullishの時はcurrentLineもnullishであってほしい
  return (selectedLine && actualCurrentStation?.line) ?? null;
};
