import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import locationState from '../store/atoms/location'
import { currentLineSelector } from '../store/selectors/currentLine'
import { getArrivedThreshold } from '../utils/threshold'
import useAverageDistance from './useAverageDistance'

export const useBadAccuracy = (): boolean => {
  const location = useRecoilValue(locationState)

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
