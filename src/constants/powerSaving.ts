import { LocationAccuracy } from 'expo-location'
import {
  DISTANCE_FILTER_BALANCED,
  DISTANCE_FILTER_HIGH,
  DISTANCE_FILTER_LOW,
} from './location'

export const POWER_SAVING_PRESETS = {
  LOW: 'LOW',
  BALANCED: 'BALANCED',
  HIGH: 'HIGH',
} as const

export type PowerSavingPreset =
  (typeof POWER_SAVING_PRESETS)[keyof typeof POWER_SAVING_PRESETS]

export type PowerPresetValue = {
  locationServiceAccuracy: LocationAccuracy
  locationServiceDistanceFilter: number
}

export const POWER_SETTING_VALUES: Record<PowerSavingPreset, PowerPresetValue> =
  {
    [POWER_SAVING_PRESETS.LOW]: {
      locationServiceAccuracy: LocationAccuracy.Balanced,
      locationServiceDistanceFilter: DISTANCE_FILTER_LOW,
    },
    [POWER_SAVING_PRESETS.BALANCED]: {
      locationServiceAccuracy: LocationAccuracy.High,
      locationServiceDistanceFilter: DISTANCE_FILTER_BALANCED,
    },
    [POWER_SAVING_PRESETS.HIGH]: {
      locationServiceAccuracy: LocationAccuracy.BestForNavigation,
      locationServiceDistanceFilter: DISTANCE_FILTER_HIGH,
    },
  } as const
