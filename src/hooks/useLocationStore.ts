import * as Location from 'expo-location'
import { create } from 'zustand'

export const useLocationStore = create<Location.LocationObject | null>(
  () => null
)

export const setLocation = (location: Location.LocationObject) =>
  useLocationStore.setState(location)

export const setLatLon = (latitude: number, longitude: number) =>
  useLocationStore.setState((prev) => {
    if (!prev) {
      return null
    }

    return { ...prev, coords: { ...prev.coords, latitude, longitude } }
  })
