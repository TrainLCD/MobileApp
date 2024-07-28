import { create } from 'zustand'
import { createLocationSlice, LocationSlice } from '../slices/locationSlice'
import { createThemeSlice, ThemeSlice } from '../slices/themeSlice'

export const useStore = create<LocationSlice & ThemeSlice>()((...a) => ({
  ...createLocationSlice(...a),
  ...createThemeSlice(...a),
}))
