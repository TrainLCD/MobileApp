import { StateCreator } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { APP_THEME, AppTheme } from '../models/Theme'

export type ThemeSlice = {
  theme: AppTheme
  setTheme: (theme: AppTheme) => void
}

export const createThemeSlice: StateCreator<
  ThemeSlice,
  [],
  [['zustand/immer', never], ['zustand/devtools', never]],
  ThemeSlice
> = immer(
  devtools((set) => ({
    theme: APP_THEME.TOKYO_METRO,
    setTheme: (theme: AppTheme) => set((state) => ({ ...state, theme })),
  }))
)
