import { useRecoilValue } from 'recoil';
import { Line } from '../models/StationAPI';
import stationState from '../store/atoms/station';
import useTransferLinesFromStation from './useTransferLinesFromStation';

const useCurrentStationTransferLines = (): Line[] => {
  const { station } = useRecoilValue(stationState);

  const transferLines = useTransferLinesFromStation(station);

  return transferLines;
};

export default useCurrentStationTransferLines;
