import { useMemo } from 'react'
import { locationStore } from '../store/vanillaLocation'
import { useThreshold } from './useThreshold'

export const useBadAccuracy = (): boolean => {
  const locationState = locationStore.getState()
  const accuracy = locationState?.coords.accuracy
  const { arrivedThreshold } = useThreshold()

  return useMemo(() => {
    if (!accuracy) {
      return false
    }
    if ((accuracy || 0) > arrivedThreshold) {
      return true
    }
    return false
  }, [arrivedThreshold, accuracy])
}
