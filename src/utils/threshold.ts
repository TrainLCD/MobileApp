import { LineType } from '../../gen/proto/stationapi_pb'
import {
  APPROACHING_BASE_THRESHOLD,
  ARRIVED_BASE_THRESHOLD,
} from '../constants'

const getMaxThreshold = (
  baseThreshold: number,
  lineType: LineType,
  operationType: 'APPROACHING' | 'ARRIVING'
): number => {
  switch (lineType) {
    case LineType.BulletTrain:
      return operationType === 'ARRIVING'
        ? baseThreshold * 3
        : baseThreshold * 10
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
    lineType || LineType.Normal,
    'APPROACHING'
  )
  const base = avgBetweenStations
    ? avgBetweenStations / 2
    : APPROACHING_BASE_THRESHOLD
  const threshold = (() => {
    switch (lineType) {
      case LineType.BulletTrain:
        return base * 10
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
    lineType || LineType.Normal,
    'ARRIVING'
  )
  const base = avgBetweenStations
    ? avgBetweenStations / 5
    : ARRIVED_BASE_THRESHOLD
  const threshold = (() => {
    switch (lineType) {
      case LineType.BulletTrain:
        return base * 5
      default:
        return base
    }
  })()
  if (threshold > maxThreshold) {
    return maxThreshold
  }
  return threshold
}
