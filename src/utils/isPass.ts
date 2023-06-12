import { StationResponse, StopCondition } from '../gen/stationapi_pb'
import isHoliday from './isHoliday'

const getIsPass = (station: StationResponse.AsObject | null): boolean => {
  if (!station) {
    return false
  }

  switch (station.stopCondition) {
    case StopCondition.ALL:
    case StopCondition.PARTIALSTOP: // 一部停車は一旦停車扱い
    case StopCondition.PARTIAL: // 一部通過は停車扱い
      return false
    case StopCondition.NOT:
      return true
    case StopCondition.WEEKDAY:
      // 若干分かりづらい感じはするけど休日に飛ばすという意味
      return isHoliday
    case StopCondition.HOLIDAY:
      return !isHoliday
    default:
      return false
  }
}

export default getIsPass
