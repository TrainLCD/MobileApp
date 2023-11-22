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
  TRIPLE_TAP_NOTICE_DISMISSED: '@TrainLCD:tripleTapNoticeDismissed',
  // QA
  QA_SPEECH_ENABLED: '@TrainLCD:qaSpeechEnabled',
  QA_LOSSLESS_ENABLED: '@TrainLCD:qaLosslessEnabled',
  QA_LOSSLESS_NOTICE: '@TrainLCD:qaLosslessNotice',
  QA_TTS_NOTICE: '@TrainLCD:qaTtsNotice',
} as const

export type AsyncStorageKeys =
  (typeof ASYNC_STORAGE_KEYS)[keyof typeof ASYNC_STORAGE_KEYS]
