import getDistance from 'geolib/es/getDistance'
import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { StopCondition } from '../../gen/proto/stationapi_pb'
import stationState from '../store/atoms/station'

const useAverageDistance = (): number => {
  const { stations } = useRecoilValue(stationState)

  const stopStations = useMemo(
    () => stations.filter((s) => s.stopCondition !== StopCondition.Not),
    [stations]
  )

  // 駅配列から平均駅間距離（直線距離）を求める
  const avgDistance = useMemo(
    (): number =>
      !stopStations.length
        ? 0
        : stopStations.reduce((acc, cur, idx, arr) => {
            const prev = arr[idx - 1]
            if (!prev) {
              return acc
            }
            const { latitude, longitude } = cur
            const { latitude: prevLatitude, longitude: prevLongitude } = prev
            const distance = getDistance(
              { latitude, longitude },
              { latitude: prevLatitude, longitude: prevLongitude },
              100
            )
            return acc + distance
          }, 0) / stopStations.length,
    [stopStations]
  )

  return avgDistance
}

export default useAverageDistance
