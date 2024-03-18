import getDistance from 'geolib/es/getDistance'
import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { APPROACHING_MAX_THRESHOLD, ARRIVED_MAX_THRESHOLD } from '../constants'
import stationState from '../store/atoms/station'
import { currentStationSelector } from '../store/selectors/currentStation'
import { useNextStation } from './useNextStation'

export const useThreshold = () => {
  const { arrived } = useRecoilValue(stationState)
  const station = useRecoilValue(
    currentStationSelector({ skipPassStation: true })
  )
  const nextStation = useNextStation(true)

  const distance = useMemo(() => {
    // NOTE: 到着直後に閾値が変わってしまうと到着判定された距離によっては
    // 次の駅に飛ばされる可能性があるためarrivedも条件に入れている
    if (!station || !nextStation || arrived) {
      return
    }
    return getDistance(
      { latitude: station.latitude, longitude: station.longitude },
      { latitude: nextStation.latitude, longitude: nextStation.longitude },
      100
    )
  }, [arrived, nextStation, station])

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
