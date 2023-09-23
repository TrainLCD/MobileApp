import { Line, Station, TrainType } from '../gen/stationapi_pb'
import getCurrentStationIndex from './currentStationIndex'
import { getIsLoopLine } from './loopLine'

type Args = {
  stations: Station.AsObject[]
  arrived: boolean
  isInbound: boolean
  currentStation: Station.AsObject | null
  currentLine: Line.AsObject | null
  currentTrainType: TrainType.AsObject | null
}

const getSlicedStations = ({
  stations,
  currentStation,
  currentLine,
  arrived,
  isInbound,
  currentTrainType,
}: Args): Station.AsObject[] => {
  const currentStationIndex = getCurrentStationIndex(stations, currentStation)
  if (arrived) {
    return isInbound
      ? stations.slice(currentStationIndex)
      : stations.slice(0, currentStationIndex + 1).reverse()
  }

  if (getIsLoopLine(currentLine, currentTrainType)) {
    // 山手線 品川 大阪環状線 寺田町
    if (stations.length - 1 === currentStationIndex) {
      return isInbound
        ? stations.slice(0, currentStationIndex).reverse()
        : stations.slice(0, currentStationIndex)
    }
    // 山手線 大崎 大阪環状線 天王寺
    if (currentStationIndex === 0) {
      return isInbound
        ? stations.slice(currentStationIndex).reverse()
        : stations.slice(currentStationIndex)
    }
    return isInbound
      ? stations.slice(0, currentStationIndex).reverse()
      : stations.slice(currentStationIndex)
  }

  if (currentStationIndex === 0) {
    return stations.slice(1)
  }

  return isInbound
    ? stations.slice(currentStationIndex)
    : stations.slice(0, currentStationIndex).reverse()
}

export default getSlicedStations
