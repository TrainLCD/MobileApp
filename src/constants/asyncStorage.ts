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
  AUTO_MODE_V2_CONFIRMED: '@TrainLCD:autoModeV2Confirmed',
  SUBWAY_ALERT_DISMISSED: '@TrainLCD:subwayAlertDismissed',
  HOLIDAY_ALERT_DISMISSED: '@TrainLCD:holidayAlertDismissed',
  WEEKDAY_ALERT_DISMISSED: '@TrainLCD:weekdayAlertDismissed',
  PARTIALLY_PASS_ALERT_DISMISSED: '@TrainLCD:partiallyPassAlertDismissed',
  TELEMETRY_ENABLED: '@TrainLCD:telemetryEnabled',
  WALKTHROUGH_COMPLETED: '@TrainLCD:walkthroughCompleted',
  ROUTE_SEARCH_WALKTHROUGH_COMPLETED:
    '@TrainLCD:routeSearchWalkthroughCompleted',
  SETTINGS_WALKTHROUGH_COMPLETED: '@TrainLCD:settingsWalkthroughCompleted',
} as const;

export type AsyncStorageKeys =
  (typeof ASYNC_STORAGE_KEYS)[keyof typeof ASYNC_STORAGE_KEYS];
