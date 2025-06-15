import { useAtom, useAtomValue } from 'jotai';
import { useEffect } from 'react';
import navigationState from '~/store/atoms/navigation';
import stationState from '~/store/atoms/station';
import { usePrevious } from './usePrevious';

export const useFirstStop = (shouldUpdate = false) => {
  const [{ firstStop }, setNavigationState] = useAtom(navigationState);
  const { arrived } = useAtomValue(stationState);
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
