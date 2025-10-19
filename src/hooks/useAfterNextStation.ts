import { useMemo } from 'react';
import { Station } from '~/@types/graphql';
import getIsPass from '../utils/isPass';
import { useCurrentStation } from './useCurrentStation';
import { useNextStation } from './useNextStation';
import { useSlicedStations } from './useSlicedStations';

export const useAfterNextStation = () => {
  const currentStation = useCurrentStation();
  const nextStation = useNextStation();
  const slicedStationsOrigin = useSlicedStations();

  // 直通時、同じGroupIDの駅が違う駅として扱われるのを防ぐ(ex. 渋谷の次は、渋谷に止まります)
  const slicedStations = useMemo(
    () =>
      Array.from(new Set(slicedStationsOrigin.map((s: any) => s.groupId)))
        .map((gid) => slicedStationsOrigin.find((s) => s.groupId === gid))
        .filter((s) => !!s)
        .map((s: any) => s),
    [slicedStationsOrigin]
  );

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
