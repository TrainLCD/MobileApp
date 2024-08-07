import { LocationObject } from 'expo-location'
import { create } from 'zustand'
import { MINIMUM_UPDATE_INTERVAL } from '../constants/location'

export const useLocationStore = create<LocationObject | null>(() => null)

export const setLocation = (location: LocationObject) =>
  useLocationStore.setState((state) => {
    if (!state) {
      return location
    }

    const { timestamp: inputTimestamp } = location
    const { timestamp: stateTimestamp } = state

    const diffInMs = inputTimestamp - stateTimestamp

    if (diffInMs > MINIMUM_UPDATE_INTERVAL) {
      return location
    }

    return state
  })
