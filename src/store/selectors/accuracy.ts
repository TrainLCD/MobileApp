import { selector } from 'recoil'
import { POWER_SETTING_VALUES, RECOIL_STATES } from '../../constants'
import powerSavingState from '../atoms/powerSaving'

export const accuracySelector = selector({
  key: RECOIL_STATES.accuracySelector,
  get: ({ get }) => {
    const powerState = get(powerSavingState)
    return (
      POWER_SETTING_VALUES[powerState.preset]?.locationServiceAccuracy ??
      POWER_SETTING_VALUES.BALANCED.locationServiceAccuracy
    )
  },
})
