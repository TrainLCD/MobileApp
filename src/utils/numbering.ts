import { HeaderTransitionState } from '../models/HeaderTransitionState';
import { Line, Station, StationNumber } from '../models/StationAPI';

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

export const getNumberingColor = (
  headerState: HeaderTransitionState,
  currentStationNumber: StationNumber | undefined,
  nextStation: Station | undefined,
  line: Line | null | undefined
): string => {
  if (currentStationNumber?.lineSymbolColor) {
    return `#${currentStationNumber?.lineSymbolColor}`;
  }
  if (headerState.split('_')[0] !== 'CURRENT' && nextStation?.currentLine) {
    return `#${nextStation.currentLine?.lineColorC}`;
  }
  return `#${line?.lineColorC}`;
};
