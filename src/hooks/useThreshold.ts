import getDistance from 'geolib/es/getDistance'
import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { APPROACHING_MAX_THRESHOLD, ARRIVED_MAX_THRESHOLD } from '../constants'
import { currentStationSelector } from '../store/selectors/currentStation'
import { useNextStation } from './useNextStation'

export const useThreshold = () => {
  const station = useRecoilValue(currentStationSelector({}))
  const nextStation = useNextStation(true)

  const approachingThreshold = useMemo(() => {
    if (!station || !nextStation) {
      return 0
    }
    const distance =
      getDistance(
        { latitude: station.latitude, longitude: station.longitude },
        { latitude: nextStation.latitude, longitude: nextStation.longitude }
      ) / 2

    if (distance > APPROACHING_MAX_THRESHOLD) {
      return APPROACHING_MAX_THRESHOLD
    }
    return distance
  }, [nextStation, station])
  const arrivedThreshold = useMemo(() => {
    if (!station || !nextStation) {
      return 0
    }
    const distance =
      getDistance(
        { latitude: station.latitude, longitude: station.longitude },
        { latitude: nextStation.latitude, longitude: nextStation.longitude }
      ) / 5
    if (distance < ARRIVED_MAX_THRESHOLD) {
      return ARRIVED_MAX_THRESHOLD
    }
    return distance
  }, [nextStation, station])

  return { approachingThreshold, arrivedThreshold }
}

// import { LineType } from '../../gen/proto/stationapi_pb'
// import {
//   APPROACHING_BASE_THRESHOLD,
//   ARRIVED_BASE_THRESHOLD,
// } from '../constants'

// const getMaxThreshold = (
//   baseThreshold: number,
//   lineType: LineType,
//   operationType: 'APPROACHING' | 'ARRIVING'
// ): number => {
//   switch (lineType) {
//     case LineType.BulletTrain:
//       return operationType === 'ARRIVING'
//         ? baseThreshold * 3
//         : baseThreshold * 10
//     default:
//       return baseThreshold
//   }
// }

// export const getApproachingThreshold = (
//   lineType: LineType | undefined,
//   avgBetweenStations: number | undefined
// ): number => {
//   const maxThreshold = getMaxThreshold(
//     APPROACHING_BASE_THRESHOLD,
//     lineType || LineType.Normal,
//     'APPROACHING'
//   )
//   const base = avgBetweenStations
//     ? avgBetweenStations / 2
//     : APPROACHING_BASE_THRESHOLD
//   const threshold = (() => {
//     switch (lineType) {
//       case LineType.BulletTrain:
//         return base * 10
//       default:
//         return base
//     }
//   })()

//   if (threshold > maxThreshold) {
//     return maxThreshold
//   }
//   return threshold
// }

// export const getArrivedThreshold = (
//   lineType: LineType | undefined,
//   avgBetweenStations: number | undefined
// ): number => {
//   const maxThreshold = getMaxThreshold(
//     ARRIVED_BASE_THRESHOLD,
//     lineType || LineType.Normal,
//     'ARRIVING'
//   )
//   const base = avgBetweenStations
//     ? avgBetweenStations / 5
//     : ARRIVED_BASE_THRESHOLD
//   const threshold = (() => {
//     switch (lineType) {
//       case LineType.BulletTrain:
//         return base * 2
//       default:
//         return base
//     }
//   })()
//   if (threshold > maxThreshold) {
//     return maxThreshold
//   }
//   return threshold
// }
