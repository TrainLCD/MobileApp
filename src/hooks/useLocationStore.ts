import * as Location from 'expo-location'
import { create } from 'zustand'
import { locationTaskName } from '../utils/locationTaskName'

export const useLocationStore = create<Location.LocationObject | null>(
  () => null
)

export const setLocation = (location: Location.LocationObject) =>
  useLocationStore.setState((state) => {
    if (!state) {
      return location
    }

    const {
      coords: { latitude: newLatitude, longitude: newLongitude },
    } = location
    const {
      coords: { latitude: stateLatitude, longitude: stateLongitude },
    } = state

    if (newLatitude === stateLatitude && newLongitude === stateLongitude) {
      // eslint-disable-next-line @typescript-eslint/no-extra-semi
      ;(async () => {
        await Location.stopLocationUpdatesAsync(locationTaskName)
        await Location.startLocationUpdatesAsync(locationTaskName)
      })()
      return state
    }

    return location
  })
