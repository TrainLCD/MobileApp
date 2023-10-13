import * as geolib from 'geolib'
import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { COMPUTE_DISTANCE_ACCURACY } from '../constants/location'
import stationState from '../store/atoms/station'

const useAverageDistance = (): number => {
  const { stations } = useRecoilValue(stationState)

  // 駅配列から平均駅間距離（直線距離）を求める
  const avgDistance = useMemo(
    (): number =>
      !stations.length
        ? 0
        : stations.reduce((acc, cur, idx, arr) => {
            const prev = arr[idx - 1]
            if (!prev) {
              return acc
            }
            const { latitude, longitude } = cur
            const { latitude: prevLatitude, longitude: prevLongitude } = prev
            const distance = geolib.getDistance(
              { latitude, longitude },
              { latitude: prevLatitude, longitude: prevLongitude },
              COMPUTE_DISTANCE_ACCURACY
            )
            return acc + distance
          }, 0) / stations.length,
    [stations]
  )

  return avgDistance
}

export default useAverageDistance
