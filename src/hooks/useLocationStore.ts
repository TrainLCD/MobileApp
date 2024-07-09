import { Location } from 'react-native-background-geolocation'
import { create } from 'zustand'

type LocationState = {
  location: Location | null
  setLocation: (location: Location) => void
}

export const useLocationStore = create<LocationState>((set) => ({
  location: null,
  setLocation: (location) => set((state) => ({ ...state, location })),
}))
