import { selector } from 'recoil'
import { RECOIL_STATES } from '../../constants'
import { APP_THEME } from '../../models/Theme'
import themeState from '../atoms/theme'

export const isLEDSelector = selector({
  key: RECOIL_STATES.isLEDSelector,
  get: ({ get }) => {
    const { theme } = get(themeState)
    return theme === APP_THEME.LED
  },
})
