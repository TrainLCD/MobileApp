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

  const distance = useMemo(() => {
    if (!station || !nextStation) {
      return
    }
    return getDistance(
      { latitude: station.latitude, longitude: station.longitude },
      { latitude: nextStation.latitude, longitude: nextStation.longitude }
    )
  }, [nextStation, station])

  const approachingThreshold = useMemo(() => {
    const threshold = (distance ?? APPROACHING_MAX_THRESHOLD) / 2
    if (threshold > APPROACHING_MAX_THRESHOLD) {
      return APPROACHING_MAX_THRESHOLD
    }
    return threshold
  }, [distance])

  const arrivedThreshold = useMemo(() => {
    const threshold = (distance ?? ARRIVED_MAX_THRESHOLD) / 5
    if (threshold > ARRIVED_MAX_THRESHOLD) {
      return ARRIVED_MAX_THRESHOLD
    }
    return threshold
  }, [distance])

  return { approachingThreshold, arrivedThreshold }
}
