import { useSetAtom } from 'jotai';
import { useCallback } from 'react';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import { isJapanese } from '../translation';

export const useResetMainState = () => {
  const setNavigationState = useSetAtom(navigationState);
  const setStationState = useSetAtom(stationState);

  const reset = useCallback(() => {
    setNavigationState((prev) => ({
      ...prev,
      headerState: isJapanese ? 'CURRENT' : 'CURRENT_EN',
      bottomState: 'LINE',
      leftStations: [],
    }));
    setStationState((prev) => ({
      ...prev,
      selectedDirection: null,
      selectedBound: null,
      arrived: true,
      approaching: false,
    }));
  }, [setNavigationState, setStationState]);

  return reset;
};
