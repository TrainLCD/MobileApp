import { Line, Station } from '../models/StationAPI';

export const filterWithoutCurrentLine = (
  allStations: Station[],
  currentLine: Line | null,
  stationIndex: number
): Line[] => {
  const currentStation = allStations[stationIndex];
  if (!currentLine || !currentStation) {
    return [];
  }
  return currentStation.lines.filter(
    (line: Line) =>
      line.id !== currentLine.id && line.nameK !== currentLine.nameK
  );
};

export const getCurrentStationLinesWithoutCurrentLine = (
  allStations: Station[],
  selectedLine: Line | null
): Line[] => filterWithoutCurrentLine(allStations, selectedLine, 0);

export const getNextStationLinesWithoutCurrentLine = (
  allStations: Station[],
  selectedLine: Line | null,
  forceStationIndex?: number
): Line[] =>
  filterWithoutCurrentLine(allStations, selectedLine, forceStationIndex ?? 1);
