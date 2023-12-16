import * as Location from 'expo-location'
import { useCallback } from 'react'
import { FETCH_LOCATION_TIMEOUT } from '../constants'
import { sleep } from '../utils/sleep'
import { useGoogleGeolocation } from './useGoogleGeolocation'

export const useCurrentPosition = () => {
  const { fetchLocationAndroid } = useGoogleGeolocation()

  const getCurrentPositionAsync =
    useCallback(async (): Promise<Location.LocationObject | null> => {
      const expoLocationPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })
      const sleepPromise = sleep(FETCH_LOCATION_TIMEOUT)
      const nullishPosition = await Promise.race([
        expoLocationPromise,
        sleepPromise,
      ])

      if (nullishPosition) {
        return nullishPosition
      }

      return fetchLocationAndroid()
    }, [fetchLocationAndroid])

  return { getCurrentPositionAsync }
}
