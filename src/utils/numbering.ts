import { Line, Station, StationNumber } from '../gen/stationapi_pb'

// TODO: 消す
export const getCurrentStationThreeLetterCode = (
  arrived: boolean,
  station: Station.AsObject,
  nextStation?: Station.AsObject
): string | undefined =>
  arrived ? station.threeLetterCode : nextStation?.threeLetterCode

export const getNumberingColor = (
  arrived: boolean,
  currentStationNumber: StationNumber.AsObject | undefined,
  nextStation: Station.AsObject | undefined,
  line: Line.AsObject | null | undefined
): string => {
  if (currentStationNumber?.lineSymbolColor) {
    return currentStationNumber?.lineSymbolColor
  }
  if (arrived && nextStation?.line) {
    return nextStation.line?.color ?? '#000'
  }
  return line?.color ?? '#000'
}
