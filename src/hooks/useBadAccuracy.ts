import { useMemo } from 'react'
import { locationStore } from '../store/vanillaLocation'
import { useThreshold } from './useThreshold'

export const useBadAccuracy = (): boolean => {
  const { arrivedThreshold } = useThreshold()

  const state = locationStore.getState()
  const { accuracy } = useMemo(() => {
    const accuracy = state?.coords.accuracy
    return { accuracy }
  }, [state?.coords.accuracy])

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
