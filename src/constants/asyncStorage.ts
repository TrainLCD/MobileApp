export const ASYNC_STORAGE_KEYS = {
  FIRST_LAUNCH_PASSED: '@TrainLCD:firstLaunchPassed',
  PREVIOUS_THEME: '@TrainLCD:previousTheme',
  ENABLED_LANGUAGES: '@TrainLCD:enabledLanguages',
  SPEECH_ENABLED: '@TrainLCD:speechEnabled',
  LOSSLESS_ENABLED: '@TrainLCD:losslessEnabled',
  DOSE_CONFIRMED: '@TrainLCD:dozeConfirmed',
  TTS_NOTICE: '@TrainLCD:ttsNotice',
  LOSSLESS_NOTICE: '@TrainLCD:losslessNotice',
  PREFERRED_POWER_SAVING_PRESET: '@TrainLCD:preferredPowerSavingPreset',
  LONG_PRESS_NOTICE_DISMISSED: '@TrainLCD:longPressNoticeDismissed',
  // QA
  QA_SPEECH_ENABLED: '@TrainLCD:qaSpeechEnabled',
  QA_LOSSLESS_ENABLED: '@TrainLCD:qaLosslessEnabled',
  QA_TTS_NOTICE: '@TrainLCD:qaTtsNotice',
  QA_BG_TTS_ENABLED: '@TrainLCD:qaBgTtsEnabled',
} as const

export type AsyncStorageKeys =
  (typeof ASYNC_STORAGE_KEYS)[keyof typeof ASYNC_STORAGE_KEYS]
