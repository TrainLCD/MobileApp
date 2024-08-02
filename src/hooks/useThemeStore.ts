import { create } from 'zustand'
import { APP_THEME, type AppTheme } from '../models/Theme'

export const useThemeStore = create<AppTheme>(() => APP_THEME.TOKYO_METRO)
