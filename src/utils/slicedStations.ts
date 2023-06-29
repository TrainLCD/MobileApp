import { LineResponse, StationResponse } from '../gen/stationapi_pb'
import getCurrentStationIndex from './currentStationIndex'
import { getIsLoopLine } from './loopLine'

type Args = {
  stations: StationResponse.AsObject[]
  arrived: boolean
  isInbound: boolean
  currentStation: StationResponse.AsObject | null
  currentLine: LineResponse.AsObject | null
  trainType: unknown
}

const getSlicedStations = ({
  stations,
  currentStation,
  currentLine,
  arrived,
  isInbound,
  trainType,
}: Args): StationResponse.AsObject[] => {
  const currentStationIndex = getCurrentStationIndex(stations, currentStation)
  if (arrived) {
    return isInbound
      ? stations.slice(currentStationIndex)
      : stations.slice(0, currentStationIndex + 1).reverse()
  }

  if (getIsLoopLine(currentLine, trainType)) {
    // 山手線 品川 大阪環状線 寺田町
    if (stations.length - 1 === currentStationIndex) {
      return isInbound
        ? stations.slice(currentStationIndex - 1)
        : stations.slice(0, currentStationIndex + 2)
    }
    return isInbound
      ? stations.slice(currentStationIndex - 1)
      : stations.slice(0, currentStationIndex + 2).reverse()
  }
  return isInbound
    ? stations.slice(currentStationIndex)
    : stations.slice(0, currentStationIndex).reverse()
}

export default getSlicedStations
