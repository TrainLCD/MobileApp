import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import { locationAtom } from '~/store/atoms/location';
import { BAD_ACCURACY_THRESHOLD } from '../constants';

export const useBadAccuracy = (): boolean => {
  const accuracy = useAtomValue(locationAtom)?.coords.accuracy;

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
