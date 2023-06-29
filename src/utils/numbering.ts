import {
  LineResponse,
  StationNumber,
  StationResponse,
} from '../gen/stationapi_pb'
import prependHEX from './prependHEX'

// TODO: 消す
export const getCurrentStationThreeLetterCode = (
  arrived: boolean,
  station: StationResponse.AsObject,
  nextStation?: StationResponse.AsObject
): string | undefined =>
  arrived ? station.threeLetterCode : nextStation?.threeLetterCode

export const getNumberingColor = (
  arrived: boolean,
  currentStationNumber: StationNumber.AsObject | undefined,
  nextStation: StationResponse.AsObject | undefined,
  line: LineResponse.AsObject | null | undefined
): string => {
  if (currentStationNumber?.lineSymbolColor) {
    return prependHEX(currentStationNumber?.lineSymbolColor)
  }
  if (arrived && nextStation?.line) {
    return prependHEX(nextStation.line?.color ?? '#000')
  }
  return prependHEX(line?.color ?? '#000')
}
