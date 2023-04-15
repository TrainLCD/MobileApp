import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import getIsPass from '../utils/isPass';
import useNextStation from './useNextStation';

const useIsPassing = (): boolean => {
  const { station, arrived } = useRecoilValue(stationState);
  const { stationForHeader } = useRecoilValue(navigationState);
  const nextStation = useNextStation();

  const passing = useMemo(() => {
    if (!nextStation) {
      return false;
    }
    if (station && getIsPass(station)) {
      return true;
    }
    if (stationForHeader?.id === station?.id && !arrived) {
      return true;
    }
    return !arrived;
  }, [arrived, nextStation, station, stationForHeader?.id]);

  return passing;
};

export default useIsPassing;
