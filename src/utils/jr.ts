import {ILine, IStation} from '../models/StationAPI';

export const omitJRLinesIfThresholdExceeded = (
  allStations: IStation[],
  currentLine: ILine,
  stationIndex: number,
): ILine[] => {
  const currentStation = allStations[stationIndex];
  if (!currentLine || !currentStation) {
    return [];
  }
  return currentStation.lines.filter(
    (line: ILine) => line.id !== currentLine.id,
  );
};

export const getCurrentStationLinesWithoutCurrentLine = (
  allStations: IStation[],
  selectedLine: ILine,
) => omitJRLinesIfThresholdExceeded(allStations, selectedLine, 0);

export const getNextStationLinesWithoutCurrentLine = (
  allStations: IStation[],
  selectedLine: ILine,
) => omitJRLinesIfThresholdExceeded(
  allStations,
  selectedLine,
  1,
);
