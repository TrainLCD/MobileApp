import { atom } from 'recoil'
import { AppTheme, APP_THEME } from '../../models/Theme'
import { RECOIL_STATES } from '../../constants'

export interface StationState {
  theme: AppTheme
}

const themeState = atom<StationState>({
  key: RECOIL_STATES.theme,
  default: {
    theme: APP_THEME.TOKYO_METRO,
  },
})

export default themeState
