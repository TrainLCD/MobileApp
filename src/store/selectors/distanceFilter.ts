import { selector } from 'recoil'
import { POWER_SETTING_VALUES, RECOIL_STATES } from '../../constants'
import powerSavingState from '../atoms/powerSaving'

export const distanceFilterSelector = selector({
  key: RECOIL_STATES.distanceFilter,
  get: ({ get }) => {
    const powerState = get(powerSavingState)
    return (
      POWER_SETTING_VALUES[powerState.preset]?.locationServiceDistanceFilter ??
      POWER_SETTING_VALUES.BALANCED.locationServiceDistanceFilter
    )
  },
})
