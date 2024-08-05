import { LocationObject } from 'expo-location'
import { create } from 'zustand'

export const useLocationStore = create<LocationObject | null>(() => null)

export const setLocation = (location: LocationObject) =>
  useLocationStore.setState((state) => {
    if (!state) {
      return location
    }

    const { latitude: inputLat, longitude: inputLon } = location.coords
    const { latitude: stateLat, longitude: stateLon } = state.coords
    if (inputLat === stateLat && inputLon === stateLon) {
      return state
    }

    return location
  })
