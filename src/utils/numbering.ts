import { Line, Station, StationNumber } from '../models/StationAPI';

// TODO: 消す
export const getCurrentStationThreeLetterCode = (
  arrived: boolean,
  station: Station,
  nextStation?: Station
): string | undefined =>
  arrived ? station.threeLetterCode : nextStation?.threeLetterCode;

export const getNumberingColor = (
  arrived: boolean,
  currentStationNumber: StationNumber | undefined,
  nextStation: Station | undefined,
  line: Line | null | undefined
): string => {
  if (currentStationNumber?.lineSymbolColor) {
    return `#${currentStationNumber?.lineSymbolColor}`;
  }
  if (arrived && nextStation?.currentLine) {
    return `#${nextStation.currentLine?.lineColorC}`;
  }
  return `#${line?.lineColorC}`;
};
