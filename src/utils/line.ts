import { Line, Station } from '../models/StationAPI';

export const filterWithoutCurrentLine = (
  allStations: Station[],
  currentLine: Line,
  stationIndex: number
): Line[] => {
  const currentStation = allStations[stationIndex];
  if (!currentLine || !currentStation) {
    return [];
  }
  return currentStation.lines.filter(
    (line: Line) => line.id !== currentLine.id
  );
};

export const getCurrentStationLinesWithoutCurrentLine = (
  allStations: Station[],
  selectedLine: Line
): Line[] => filterWithoutCurrentLine(allStations, selectedLine, 0);

export const getNextStationLinesWithoutCurrentLine = (
  allStations: Station[],
  selectedLine: Line
): Line[] => filterWithoutCurrentLine(allStations, selectedLine, 1);
