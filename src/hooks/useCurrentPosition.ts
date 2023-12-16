import * as Location from 'expo-location'
import { useCallback } from 'react'

export const useCurrentPosition = () => {
  const getCurrentPositionAsync =
    useCallback(async (): Promise<Location.LocationObject | null> => {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })

      return pos
    }, [])

  return { getCurrentPositionAsync }
}
