export const ASYNC_STORAGE_KEYS = {
  FIRST_LAUNCH_PASSED: '@TrainLCD:firstLaunchPassed',
  PREVIOUS_THEME: '@TrainLCD:previousTheme',
  ENABLED_LANGUAGES: '@TrainLCD:enabledLanguages',
  SPEECH_ENABLED: '@TrainLCD:speechEnabled',
  DOSE_CONFIRMED: '@TrainLCD:dozeConfirmed',
  TTS_NOTICE: '@TrainLCD:ttsNotice',
} as const

export type AsyncStorageKeys =
  (typeof ASYNC_STORAGE_KEYS)[keyof typeof ASYNC_STORAGE_KEYS]
