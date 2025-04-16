export const ASYNC_STORAGE_KEYS = {
  FIRST_LAUNCH_PASSED: '@TrainLCD:firstLaunchPassed',
  PREVIOUS_THEME: '@TrainLCD:previousTheme',
  ENABLED_LANGUAGES: '@TrainLCD:enabledLanguages',
  SPEECH_ENABLED: '@TrainLCD:speechEnabled',
  DOZE_CONFIRMED: '@TrainLCD:dozeConfirmed',
  TTS_NOTICE: '@TrainLCD:ttsNotice',
  LONG_PRESS_NOTICE_DISMISSED: '@TrainLCD:longPressNoticeDismissed',
  ALWAYS_PERMISSION_NOT_GRANTED_WARNING_DISMISSED:
    '@TrainLCD:alwaysPermissionNotGrantedWarningDismissed',
  BG_TTS_ENABLED: '@TrainLCD:qaBgTtsEnabled',
  BG_TTS_NOTICE: '@TrainLCD:bgTtsNotice',
} as const;

export type AsyncStorageKeys =
  (typeof ASYNC_STORAGE_KEYS)[keyof typeof ASYNC_STORAGE_KEYS];
