import type { Line, Station } from '~/@types/graphql';

export const filterWithoutCurrentLine = (
  stations: Station[],
  currentLine: Line | null,
  stationIndex: number
): Line[] => {
  const currentStation = stations[stationIndex];
  if (!currentLine || !currentStation) {
    return [];
  }
  return (
    currentStation.lines?.filter(
      (line: Line) =>
        line.id !== currentLine.id &&
        line.nameKatakana !== currentLine.nameKatakana
    ) ?? []
  );
};

export const getCurrentStationLinesWithoutCurrentLine = (
  stations: Station[],
  selectedLine: Line | null
): Line[] => filterWithoutCurrentLine(stations, selectedLine, 0);

export const getNextStationLinesWithoutCurrentLine = (
  stations: Station[],
  selectedLine: Line | null,
  forceStationIndex?: number
): Line[] =>
  filterWithoutCurrentLine(stations, selectedLine, forceStationIndex ?? 1);
