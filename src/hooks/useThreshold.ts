import { useMemo } from 'react'
import { APPROACHING_MAX_THRESHOLD, ARRIVED_MAX_THRESHOLD } from '../constants'
import useAverageDistance from './useAverageDistance'

export const useThreshold = () => {
  const avgDistance = useAverageDistance()

  const approachingThreshold = useMemo(() => {
    if (!avgDistance) {
      return APPROACHING_MAX_THRESHOLD
    }

    const threshold = avgDistance / 2
    if (threshold > APPROACHING_MAX_THRESHOLD) {
      return APPROACHING_MAX_THRESHOLD
    }
    return threshold
  }, [avgDistance])

  const arrivedThreshold = useMemo(() => {
    if (!avgDistance) {
      return ARRIVED_MAX_THRESHOLD
    }
    const threshold = avgDistance / 4.5
    if (threshold > ARRIVED_MAX_THRESHOLD) {
      return ARRIVED_MAX_THRESHOLD
    }
    return threshold
  }, [avgDistance])

  return { approachingThreshold, arrivedThreshold }
}
