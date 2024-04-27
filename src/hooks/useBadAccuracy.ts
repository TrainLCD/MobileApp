import { useMemo } from 'react'
import { useLocationStore } from './useLocationStore'

export const useBadAccuracy = (): boolean => {
  const location = useLocationStore((state) => state.location)
  const badAccuracyThreshold = 500

  return useMemo(() => {
    if (!location?.coords?.accuracy) {
      return false
    }
    if ((location.coords.accuracy || 0) > badAccuracyThreshold) {
      return true
    }
    return false
  }, [location?.coords.accuracy])
}
