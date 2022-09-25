import { useRecoilValue } from 'recoil';
import { Station } from '../models/StationAPI';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import getNextStation from '../utils/getNextStation';
import {
  getNextInboundStopStation,
  getNextOutboundStopStation,
} from '../utils/nextStation';

const useNextStation = (): Station | undefined => {
  const { leftStations } = useRecoilValue(navigationState);
  const { station, stations, selectedDirection } = useRecoilValue(stationState);

  const actualNextStation = getNextStation(leftStations, station);

  const nextInboundStopStation = getNextInboundStopStation(
    stations,
    actualNextStation,
    station
  );
  const nextOutboundStopStation = getNextOutboundStopStation(
    stations,
    actualNextStation,
    station
  );

  return selectedDirection === 'INBOUND'
    ? nextInboundStopStation
    : nextOutboundStopStation;
};

export default useNextStation;
