import { useMemo } from 'react'
import { useLocationStore } from './useLocationStore'
import { useThreshold } from './useThreshold'

export const useBadAccuracy = (): boolean => {
  const location = useLocationStore((state) => state.location)
  const { arrivedThreshold } = useThreshold()

  return useMemo(() => {
    if (!location?.coords?.accuracy) {
      return false
    }
    if ((location.coords.accuracy || 0) > arrivedThreshold) {
      return true
    }
    return false
  }, [arrivedThreshold, location?.coords.accuracy])
}
