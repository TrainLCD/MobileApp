import getDistance from 'geolib/es/getDistance'
import { useEffect, useMemo } from 'react'
import { useRecoilState } from 'recoil'
import { StopCondition } from '../../gen/proto/stationapi_pb'
import stationState from '../store/atoms/station'

const useAverageDistance = (): number => {
  const [
    { averageDistance: cachedAverageDistance, stations },
    setStationState,
  ] = useRecoilState(stationState)

  const stopStations = useMemo(
    () => stations.filter((s) => s.stopCondition !== StopCondition.Not),
    [stations]
  )

  // 駅配列から平均駅間距離（直線距離）を求める
  useEffect(() => {
    if (!stopStations.length) {
      return
    }
    const avg =
      stopStations.reduce((acc, cur, idx, arr) => {
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
      }, 0) / stopStations.length

    setStationState((prev) => ({ ...prev, averageDistance: avg }))
  }, [setStationState, stopStations])

  return cachedAverageDistance ?? 0
}

export default useAverageDistance
