import getDistance from 'geolib/es/getDistance'
import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { APPROACHING_MAX_THRESHOLD, ARRIVED_MAX_THRESHOLD } from '../constants'
import { currentStationSelector } from '../store/selectors/currentStation'
import { useNextStation } from './useNextStation'

export const useThreshold = () => {
  const station = useRecoilValue(
    currentStationSelector({ skipPassStation: true })
  )
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
    if (distance > ARRIVED_MAX_THRESHOLD) {
      return ARRIVED_MAX_THRESHOLD
    }
    return distance
  }, [nextStation, station])

  return { approachingThreshold, arrivedThreshold }
}
