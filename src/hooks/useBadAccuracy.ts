import { useMemo } from 'react'
import { useStore } from './useStore'
import { useThreshold } from './useThreshold'

export const useBadAccuracy = (): boolean => {
  const accuracy = useStore((state) => state.location?.coords.accuracy)
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
