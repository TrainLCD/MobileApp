import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import { locationAccuracyAtom } from '~/store/selectors/location';
import { BAD_ACCURACY_THRESHOLD } from '../constants';

export const useBadAccuracy = (): boolean => {
  // 座標だけが変わる更新で再レンダーされないよう、accuracyのみを購読する
  const accuracy = useAtomValue(locationAccuracyAtom);

  return useMemo(() => {
    if (!accuracy) {
      return false;
    }
    if (accuracy > BAD_ACCURACY_THRESHOLD) {
      return true;
    }
    return false;
  }, [accuracy]);
};
