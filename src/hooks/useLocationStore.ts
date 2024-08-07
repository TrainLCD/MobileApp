import { LocationObject } from 'expo-location'
import { create } from 'zustand'

export const useLocationStore = create<LocationObject | null>(() => null)

export const setLocation = (location: LocationObject) =>
  useLocationStore.setState(location, true)
