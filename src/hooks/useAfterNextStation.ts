import { useMemo } from 'react';
import type { Station } from '~/@types/graphql';
import getIsPass from '../utils/isPass';
import { useDisplayNextStation } from './useDisplayNextStation';
import { useSlicedStations } from './useSlicedStations';

export const useAfterNextStation = () => {
  // 案内面 (ヘッダー・TTS・LED) が「次の駅」として見せる駅を起点にする。
  // 到着判定の取りこぼしで stationState が古いまま接近放送に入ると、
  // useNextStation 起点では案内中の次駅自身が次々駅として選ばれてしまい
  // 「大門の次は、大門にとまります」のような誤案内になる (useDisplayNextStation は
  // 接近中はGPS基準で自己修復されるため、案内中の次駅と必ず一致する)。
  const nextStation = useDisplayNextStation();
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

  const afterNextStation = useMemo(() => {
    const nextStationIndex = slicedStations.findIndex(
      (s) => s.groupId === nextStation?.groupId
    );
    // 次駅が進行方向の駅リストに見つからない場合は、誤った駅を案内するより
    // 次々駅の案内自体を省略する方が安全なので undefined を返す。
    if (nextStationIndex === -1) {
      return undefined;
    }
    // 次駅より進行方向側で最初に停車する駅が「次々駅」
    return slicedStations.find((s, i) => i > nextStationIndex && !getIsPass(s));
  }, [nextStation?.groupId, slicedStations]);

  return afterNextStation;
};
