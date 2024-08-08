import { atom } from 'recoil'
import {
  POWER_SAVING_PRESETS,
  PowerSavingPreset,
  RECOIL_STATES,
} from '../../constants'

export type PowerSavingState = {
  preset: PowerSavingPreset
}

const powerSavingState = atom<PowerSavingState>({
  key: RECOIL_STATES.powerSavingState,
  default: { preset: POWER_SAVING_PRESETS.BALANCED },
})

export default powerSavingState
