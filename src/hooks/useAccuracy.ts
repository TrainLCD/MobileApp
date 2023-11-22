import { useRecoilValue } from 'recoil'
import {
  POWER_SAVING_PRESETS,
  POWER_SETTING_VALUES,
  PowerPresetValue,
} from '../constants'
import powerSavingState from '../store/atoms/powerSaving'

export const useAccuracy = (): PowerPresetValue => {
  const { preset } = useRecoilValue(powerSavingState)

  return POWER_SETTING_VALUES[preset ?? POWER_SAVING_PRESETS.HIGH]
}
