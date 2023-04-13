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

  const actualNextStation =
    (station && getNextStation(leftStations, station)) ?? undefined;

  const nextInboundStopStation =
    actualNextStation &&
    station &&
    getNextInboundStopStation(stations, actualNextStation, station);
  const nextOutboundStopStation =
    actualNextStation &&
    station &&
    getNextOutboundStopStation(stations, actualNextStation, station);

  const nextStation =
    selectedDirection === 'INBOUND'
      ? nextInboundStopStation
      : nextOutboundStopStation;

  return nextStation ?? undefined;
};

export default useNextStation;
