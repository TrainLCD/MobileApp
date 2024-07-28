import { LocationObject } from 'expo-location'
import { StateCreator } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

export type LocationSlice = {
  location: LocationObject | null
  setLocation: (location: LocationObject) => void
}

export const createLocationSlice: StateCreator<
  LocationSlice,
  [],
  [['zustand/immer', never], ['zustand/devtools', never]],
  LocationSlice
> = immer(
  devtools((set) => ({
    location: null,
    setLocation: (location: LocationObject) =>
      set((state) => ({ ...state, location })),
  }))
)
