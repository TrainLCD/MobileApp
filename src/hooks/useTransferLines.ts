import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import { Line } from '../models/StationAPI';
import stationState from '../store/atoms/station';
import getIsPass from '../utils/isPass';
import useNextStation from './useNextStation';
import useTransferLinesFromStation from './useTransferLinesFromStation';

const useTransferLines = (): Line[] => {
  const { station, arrived } = useRecoilValue(stationState);
  const nextStation = useNextStation();
  const targetStation = useMemo(
    () => (arrived && !getIsPass(station) ? station : nextStation ?? null),
    [arrived, nextStation, station]
  );

  const transferLines = useTransferLinesFromStation(targetStation);

  return transferLines;
};

export default useTransferLines;
