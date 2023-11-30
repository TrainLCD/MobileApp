import { LocationAccuracy } from 'expo-location'
import {
  COMPUTE_DISTANCE_ACCURACY_HIGH,
  COMPUTE_DISTANCE_ACCURACY_LOW,
  COMPUTE_DISTANCE_ACCURACY_NORMAL,
} from './location'

export const POWER_SAVING_PRESETS = {
  LOWEST: 'LOWEST',
  LOW: 'LOW',
  BALANCED: 'BALANCED',
  HIGH: 'HIGH',
  HIGHEST: 'HIGHEST',
} as const

export type PowerSavingPreset =
  (typeof POWER_SAVING_PRESETS)[keyof typeof POWER_SAVING_PRESETS]

export type PowerPresetValue = {
  locationServiceAccuracy: LocationAccuracy
  computeDistanceAccuracy: number
  locationServiceDistanceFilter: number
}

export const POWER_SETTING_VALUES: Record<PowerSavingPreset, PowerPresetValue> =
  {
    [POWER_SAVING_PRESETS.LOWEST]: {
      locationServiceAccuracy: LocationAccuracy.Low,
      computeDistanceAccuracy: COMPUTE_DISTANCE_ACCURACY_LOW,
      locationServiceDistanceFilter: 100,
    },
    [POWER_SAVING_PRESETS.LOW]: {
      locationServiceAccuracy: LocationAccuracy.Balanced,
      computeDistanceAccuracy: COMPUTE_DISTANCE_ACCURACY_LOW,
      locationServiceDistanceFilter: 100,
    },
    [POWER_SAVING_PRESETS.BALANCED]: {
      locationServiceAccuracy: LocationAccuracy.Balanced,
      computeDistanceAccuracy: COMPUTE_DISTANCE_ACCURACY_NORMAL,
      locationServiceDistanceFilter: 50,
    },
    [POWER_SAVING_PRESETS.HIGH]: {
      locationServiceAccuracy: LocationAccuracy.High,
      computeDistanceAccuracy: COMPUTE_DISTANCE_ACCURACY_NORMAL,
      locationServiceDistanceFilter: 10,
    },
    [POWER_SAVING_PRESETS.HIGHEST]: {
      locationServiceAccuracy: LocationAccuracy.High,
      computeDistanceAccuracy: COMPUTE_DISTANCE_ACCURACY_HIGH,
      locationServiceDistanceFilter: 10,
    },
  } as const
