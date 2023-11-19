import getDistance from 'geolib/es/getDistance'
import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { StopCondition } from '../gen/stationapi_pb'
import stationState from '../store/atoms/station'
import { useAccuracy } from './useAccuracy'

const useAverageDistance = (): number => {
  const { computeDistanceAccuracy } = useAccuracy()
  const { stations } = useRecoilValue(stationState)

  // 駅配列から平均駅間距離（直線距離）を求める
  const avgDistance = useMemo(
    (): number =>
      !stations.length
        ? 0
        : stations
            .filter((s) => s.stopCondition !== StopCondition.NOT)
            .reduce((acc, cur, idx, arr) => {
              const prev = arr[idx - 1]
              if (!prev) {
                return acc
              }
              const { latitude, longitude } = cur
              const { latitude: prevLatitude, longitude: prevLongitude } = prev
              const distance = getDistance(
                { latitude, longitude },
                { latitude: prevLatitude, longitude: prevLongitude },
                computeDistanceAccuracy
              )
              return acc + distance
            }, 0) / stations.length,
    [computeDistanceAccuracy, stations]
  )

  return avgDistance
}

export default useAverageDistance
