import {
  APPROACHING_BASE_THRESHOLD,
  ARRIVED_BASE_THRESHOLD,
} from '../constants/threshold'
import { LineType } from '../gen/stationapi_pb'

const getMaxThreshold = (
  baseThreshold: number,
  lineType: LineType,
  operationType: 'APPROACHING' | 'ARRIVING'
): number => {
  switch (lineType) {
    case LineType.BULLETTRAIN:
      return operationType === 'ARRIVING'
        ? baseThreshold * 5
        : baseThreshold * 10
    case LineType.SUBWAY:
      return baseThreshold * 1.5
    default:
      return baseThreshold
  }
}

export const getApproachingThreshold = (
  lineType: LineType | undefined,
  avgBetweenStations: number | undefined
): number => {
  const maxThreshold = getMaxThreshold(
    APPROACHING_BASE_THRESHOLD,
    lineType || LineType.NORMAL,
    'APPROACHING'
  )
  const base = avgBetweenStations ? avgBetweenStations / 2 : 0
  const threshold = (() => {
    switch (lineType) {
      case LineType.BULLETTRAIN:
        return base * 10
      case LineType.SUBWAY:
        return base * 1.5
      default:
        return base
    }
  })()

  if (threshold > maxThreshold) {
    return maxThreshold
  }
  return threshold
}

export const getArrivedThreshold = (
  lineType: LineType | undefined,
  avgBetweenStations: number | undefined
): number => {
  const maxThreshold = getMaxThreshold(
    ARRIVED_BASE_THRESHOLD,
    lineType || LineType.NORMAL,
    'ARRIVING'
  )
  const base = avgBetweenStations ? avgBetweenStations / 5 : 300
  const threshold = (() => {
    switch (lineType) {
      case LineType.BULLETTRAIN:
        return base * 2
      case LineType.SUBWAY:
        return base * 1.5
      default:
        return base
    }
  })()
  if (threshold > maxThreshold) {
    return maxThreshold
  }
  return threshold
}
