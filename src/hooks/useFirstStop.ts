import { useAtomValue, useSetAtom } from 'jotai';
import { useEffect } from 'react';
import navigationState, { firstStopAtom } from '~/store/atoms/navigation';
import { arrivedAtom } from '~/store/atoms/station';
import { usePrevious } from './usePrevious';

export const useFirstStop = (shouldUpdate = false) => {
  const firstStop = useAtomValue(firstStopAtom);
  const setNavigationState = useSetAtom(navigationState);
  const arrived = useAtomValue(arrivedAtom);
  const prevArrived = usePrevious(arrived);

  useEffect(() => {
    if (!arrived && prevArrived && shouldUpdate) {
      setNavigationState((prev) => ({
        ...prev,
        firstStop: prev.firstStop ? false : prev.firstStop,
      }));
    }
  }, [arrived, prevArrived, setNavigationState, shouldUpdate]);

  return firstStop;
};
