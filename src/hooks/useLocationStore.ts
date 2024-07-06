import { LocationObject } from 'expo-location'
import { create } from 'zustand'

type LocationState = {
  location: LocationObject | null
  setLocation: (location: LocationObject) => void
}

export const useLocationStore = create<LocationState>((set) => ({
  location: null,
  setLocation: (location) => set((state) => ({ ...state, location })),
}))
