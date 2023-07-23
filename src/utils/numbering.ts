import { Line, Station, StationNumber } from '../gen/stationapi_pb'
import prependHEX from './prependHEX'

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
    return prependHEX(currentStationNumber?.lineSymbolColor)
  }
  if (arrived && nextStation?.line) {
    return prependHEX(nextStation.line?.color ?? '#000')
  }
  return prependHEX(line?.color ?? '#000')
}
