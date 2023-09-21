import { Line, Station } from '../gen/stationapi_pb'

export const filterWithoutCurrentLine = (
  allStations: Station.AsObject[],
  currentLine: Line.AsObject | null,
  stationIndex: number
): Line.AsObject[] => {
  const currentStation = allStations[stationIndex]
  if (!currentLine || !currentStation) {
    return []
  }
  return currentStation.linesList.filter(
    (line: Line.AsObject) =>
      line.id !== currentLine.id &&
      line.nameKatakana !== currentLine.nameKatakana
  )
}

export const getCurrentStationLinesWithoutCurrentLine = (
  allStations: Station.AsObject[],
  selectedLine: Line.AsObject | null
): Line.AsObject[] => filterWithoutCurrentLine(allStations, selectedLine, 0)

export const getNextStationLinesWithoutCurrentLine = (
  allStations: Station.AsObject[],
  selectedLine: Line.AsObject | null,
  forceStationIndex?: number
): Line.AsObject[] =>
  filterWithoutCurrentLine(allStations, selectedLine, forceStationIndex ?? 1)
