import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import type { HeaderStoppingState } from '../models/HeaderTransitionState';
import stationState from '../store/atoms/station';
import getIsPass from '../utils/isPass';
import { useCurrentStation } from './useCurrentStation';
import { useDisplayNextStation } from './useDisplayNextStation';

export const useStoppingState = (): HeaderStoppingState => {
  const { arrived, approaching } = useAtomValue(stationState);
  const currentStation = useCurrentStation();
  // まもなく表示時は現在地基準で接近している駅を次駅として状態判定する
  const nextStation = useDisplayNextStation();

  const currentStateKey = useMemo(() => {
    if ((arrived && !getIsPass(currentStation)) || !nextStation) {
      return 'CURRENT';
    }
    // 次に通る駅が通過駅である場合、通過駅に対して「まもなく」と表示されないようにする
    if (approaching && !arrived && !getIsPass(nextStation)) {
      return 'ARRIVING';
    }
    return 'NEXT';
  }, [approaching, arrived, currentStation, nextStation]);

  return currentStateKey;
};
