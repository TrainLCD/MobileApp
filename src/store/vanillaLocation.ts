import { LocationObject } from 'expo-location'
import { createStore } from 'zustand/vanilla'

export const locationStore = createStore<LocationObject | null>(() => null)
