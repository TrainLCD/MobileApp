import type { Line, Station, StationNumber } from '~/@types/graphql';

export const getNumberingColor = (
  arrived: boolean,
  currentStationNumber: StationNumber | undefined,
  nextStation: Station | undefined,
  line: Line | null | undefined
): string => {
  if (currentStationNumber?.lineSymbolColor) {
    return currentStationNumber?.lineSymbolColor;
  }
  if (arrived && nextStation?.line) {
    return nextStation.line?.color ?? '#000';
  }
  return line?.color ?? '#000';
};
