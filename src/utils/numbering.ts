import { HeaderTransitionState } from '../models/HeaderTransitionState';
import { Station, StationNumber } from '../models/StationAPI';

export const getCurrentStationNumber = (
  headerState: HeaderTransitionState,
  station: Station,
  nextStation?: Station
): StationNumber | undefined =>
  headerState.split('_')[0] === 'CURRENT'
    ? station.stationNumbers?.[0]
    : nextStation?.stationNumbers?.[0];

export const getCurrentStationThreeLetterCode = (
  headerState: HeaderTransitionState,
  station: Station,
  nextStation?: Station
): string | undefined =>
  headerState.split('_')[0] === 'CURRENT'
    ? station.threeLetterCode
    : nextStation?.threeLetterCode;
