import { LineResponse, StationResponse } from '../gen/stationapi_pb'

export const filterWithoutCurrentLine = (
  allStations: StationResponse.AsObject[],
  currentLine: LineResponse.AsObject | null,
  stationIndex: number
): LineResponse.AsObject[] => {
  const currentStation = allStations[stationIndex]
  if (!currentLine || !currentStation) {
    return []
  }
  return currentStation.linesList.filter(
    (line: LineResponse.AsObject) =>
      line.id !== currentLine.id &&
      line.nameKatakana !== currentLine.nameKatakana
  )
}

export const getCurrentStationLinesWithoutCurrentLine = (
  allStations: StationResponse.AsObject[],
  selectedLine: LineResponse.AsObject | null
): LineResponse.AsObject[] =>
  filterWithoutCurrentLine(allStations, selectedLine, 0)

export const getNextStationLinesWithoutCurrentLine = (
  allStations: StationResponse.AsObject[],
  selectedLine: LineResponse.AsObject | null,
  forceStationIndex?: number
): LineResponse.AsObject[] =>
  filterWithoutCurrentLine(allStations, selectedLine, forceStationIndex ?? 1)
