import { HeaderTransitionState } from '../models/HeaderTransitionState';
import { Station, StationNumber } from '../models/StationAPI';

const getCurrentStationNumber = (
  headerState: HeaderTransitionState,
  station: Station,
  nextStation?: Station
): StationNumber | undefined =>
  headerState.split('_')[0] === 'CURRENT'
    ? station.stationNumbers?.[0]
    : nextStation?.stationNumbers?.[0];

export default getCurrentStationNumber;
