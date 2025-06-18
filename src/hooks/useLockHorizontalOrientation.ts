import {
  lockAsync,
  OrientationLock,
  unlockAsync,
} from 'expo-screen-orientation';
import { useAtomValue } from 'jotai';
import { useEffect } from 'react';
import stationState from '~/store/atoms/station';

export const useLockHorizontalOrientation = () => {
  const { selectedBound } = useAtomValue(stationState);

  useEffect(() => {
    if (selectedBound) {
      lockAsync(OrientationLock.LANDSCAPE)
        .then(() => console.log('Orientation locked'))
        .catch(console.error);
    } else {
      unlockAsync()
        .then(() => {
          console.log('Orientation unlocked');
        })
        .catch(console.error);
    }
  }, [selectedBound]);
};
