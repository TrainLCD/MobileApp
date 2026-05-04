import { useMemo } from 'react';
import type { Station } from '~/@types/graphql';
import getIsPass from '../utils/isPass';
import { useCurrentStation } from './useCurrentStation';
import { useNextStation } from './useNextStation';
import { useSlicedStations } from './useSlicedStations';

export const useAfterNextStation = () => {
  const currentStation = useCurrentStation();
  const nextStation = useNextStation();
  const slicedStationsOrigin = useSlicedStations();

  // 直通時、同じGroupIDの駅が違う駅として扱われるのを防ぐ(ex. 渋谷の次は、渋谷に止まります)
  // 以前は new Set + find のチェーンで O(n²) だった。Map + 単一スキャンで O(n) に。
  const slicedStations = useMemo(() => {
    const seen = new Map<number, Station>();
    const result: Station[] = [];
    for (const s of slicedStationsOrigin) {
      if (s.groupId == null) continue;
      if (!seen.has(s.groupId)) {
        seen.set(s.groupId, s);
        result.push(s);
      }
    }
    return result;
  }, [slicedStationsOrigin]);

  const afterNextStation = useMemo(
    () =>
      slicedStations.find((s) => {
        if (s.groupId === currentStation?.groupId) {
          return false;
        }
        if (s.groupId === nextStation?.groupId) {
          return false;
        }
        return !getIsPass(s);
      }),
    [currentStation?.groupId, nextStation?.groupId, slicedStations]
  );

  return afterNextStation;
};
