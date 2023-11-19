import { LocationAccuracy } from 'expo-location'
import {
  COMPUTE_DISTANCE_ACCURACY,
  COMPUTE_DISTANCE_ACCURACY_HIGH,
  COMPUTE_DISTANCE_ACCURACY_LOW,
} from './location'

export const POWER_SAVING_PRESETS = {
  LOW_ENERGY: 'LOW_ENERGY',
  BALANCED: 'BALANCED',
  HIGH_ACCURACY: 'HIGH_ACCURACY',
} as const

export type PowerSavingPreset =
  (typeof POWER_SAVING_PRESETS)[keyof typeof POWER_SAVING_PRESETS]

export type PowerPresetValue = {
  locationServiceAccuracy: LocationAccuracy
  computeDistanceAccuracy: number
}

export const POWER_SETTING_VALUES: Record<PowerSavingPreset, PowerPresetValue> =
  {
    [POWER_SAVING_PRESETS.LOW_ENERGY]: {
      locationServiceAccuracy: LocationAccuracy.Balanced,
      computeDistanceAccuracy: COMPUTE_DISTANCE_ACCURACY_LOW,
    },
    [POWER_SAVING_PRESETS.BALANCED]: {
      locationServiceAccuracy: LocationAccuracy.High,
      computeDistanceAccuracy: COMPUTE_DISTANCE_ACCURACY,
    },
    [POWER_SAVING_PRESETS.HIGH_ACCURACY]: {
      locationServiceAccuracy: LocationAccuracy.BestForNavigation,
      computeDistanceAccuracy: COMPUTE_DISTANCE_ACCURACY_HIGH,
    },
  } as const
