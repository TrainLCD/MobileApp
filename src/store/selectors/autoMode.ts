import { selector } from 'recoil'
import { RECOIL_STATES } from '../../constants'
import navigationState from '../atoms/navigation'

export const autoModeEnabledSelector = selector({
  key: RECOIL_STATES.autoModeEnabledSelector,
  get: ({ get }) => get(navigationState).autoModeEnabled,
})
