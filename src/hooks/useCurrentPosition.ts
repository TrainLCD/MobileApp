import * as Location from 'expo-location'
import { useCallback } from 'react'

export const useCurrentPosition = () => {
  const getCurrentPositionAsync = useCallback(
    () =>
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      }),
    []
  )

  return { getCurrentPositionAsync }
}
