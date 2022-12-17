export const ASYNC_STORAGE_KEYS = {
  FirstLaunchPassed: '@TrainLCD:firstLaunchPassed',
  PreviousTheme: '@TrainLCD:previousTheme',
  EnabledLanguages: '@TrainLCD:enabledLanguages',
  SpeechEnabled: '@TrainLCD:speechEnabled',
  DozeConfirmed: '@TrainLCD:dozeConfirmed',
  TTSNotice: '@TrainLCD:ttsNotice',
  DevModeEnabled: '@TrainLCD:devModeEnabled',
} as const;

export type AsyncStorageKeys =
  typeof ASYNC_STORAGE_KEYS[keyof typeof ASYNC_STORAGE_KEYS];
