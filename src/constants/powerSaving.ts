import { LocationAccuracy } from 'expo-location'

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

// TODO: distanceFilterのテストを実施&適切なlocationServiceDistanceFilterを決める
export const POWER_SETTING_VALUES: Record<PowerSavingPreset, PowerPresetValue> =
  {
    [POWER_SAVING_PRESETS.LOW]: {
      locationServiceAccuracy: LocationAccuracy.Balanced,
      locationServiceDistanceFilter: 100,
    },
    [POWER_SAVING_PRESETS.BALANCED]: {
      locationServiceAccuracy: LocationAccuracy.High,
      locationServiceDistanceFilter: 100,
    },
    [POWER_SAVING_PRESETS.HIGH]: {
      locationServiceAccuracy: LocationAccuracy.BestForNavigation,
      locationServiceDistanceFilter: 100,
    },
  } as const
