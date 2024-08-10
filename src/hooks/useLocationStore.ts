import { LocationObject } from 'expo-location'
import { create } from 'zustand'

export const useLocationStore = create<LocationObject | null>(() => null)

export const setLocation = (location: LocationObject) =>
  useLocationStore.setState((state) => {
    if (!state) {
      return location
    }

    const { timestamp: inputTimestamp } = location
    const { timestamp: stateTimestamp } = state

    const diffInMs = inputTimestamp - stateTimestamp

    if (diffInMs > 10 * 1000) {
      return location
    }

    return state
  })
