import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { currentLineSelector } from '../store/selectors/currentLine'
import { getArrivedThreshold } from '../utils/threshold'
import useAverageDistance from './useAverageDistance'
import { useLocationStore } from './useLocationStore'

export const useBadAccuracy = (): boolean => {
  const location = useLocationStore((state) => state.location)

  const currentLine = useRecoilValue(currentLineSelector)
  const avgDistance = useAverageDistance()

  return useMemo(() => {
    if (!location?.coords?.accuracy) {
      return false
    }
    const maximumAccuracy = getArrivedThreshold(
      currentLine?.lineType,
      avgDistance
    )
    if ((location.coords.accuracy || 0) > maximumAccuracy) {
      return true
    }
    return false
  }, [avgDistance, currentLine?.lineType, location?.coords.accuracy])
}
