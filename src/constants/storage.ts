// NOTE: AsyncStorage 時代からのキーを MMKV でもそのまま使う。
// 値の互換性を保つため、既存キーの文字列は変更しないこと。
export const STORAGE_KEYS = {
  FIRST_LAUNCH_PASSED: '@TrainLCD:firstLaunchPassed',
  PREVIOUS_THEME: '@TrainLCD:previousTheme',
  THEME_PREFERENCE: '@TrainLCD:themePreference',
  COLOR_SCHEME_PREFERENCE: '@TrainLCD:colorSchemePreference',
  ENABLED_LANGUAGES: '@TrainLCD:enabledLanguages',
  SPEECH_ENABLED: '@TrainLCD:speechEnabled',
  TTS_ENABLED_LANGUAGES: '@TrainLCD:ttsEnabledLanguages',
  TTS_SPEED_PREFERENCE: '@TrainLCD:ttsSpeedPreference',
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
  DEV_OVERLAY_ENABLED: '@TrainLCD:devOverlayEnabled',
  HEADER_TRANSITION_INTERVAL: '@TrainLCD:headerTransitionInterval',
  HEADER_TRANSITION_DELAY: '@TrainLCD:headerTransitionDelay',
  BOTTOM_TRANSITION_INTERVAL: '@TrainLCD:bottomTransitionInterval',
  UNTOUCHABLE_MODE_ENABLED: '@TrainLCD:untouchableModeEnabled',
  WALKTHROUGH_COMPLETED: '@TrainLCD:walkthroughCompleted',
  ROUTE_SEARCH_WALKTHROUGH_COMPLETED:
    '@TrainLCD:routeSearchWalkthroughCompleted',
  SETTINGS_WALKTHROUGH_COMPLETED: '@TrainLCD:settingsWalkthroughCompleted',
  WRONG_DIRECTION_NOTIFY_ENABLED: '@TrainLCD:wrongDirectionNotifyEnabled',
  PICTURE_IN_PICTURE_ENABLED: '@TrainLCD:pictureInPictureEnabled',
  PORTRAIT_MODE_ENABLED: '@TrainLCD:portraitModeEnabled',
  POWER_SAVING_LOCATION_ENABLED: '@TrainLCD:powerSavingLocationEnabled',
  // ポートレートモードの訴求導線。オンにした時点で PROMO_FINISHED を立て、
  // 以降はオフに戻されても再訴求しない(一度判断した機能を売り込み直さない)
  PORTRAIT_PROMO_FINISHED: '@TrainLCD:portraitPromoFinished',
  PORTRAIT_PROMO_PROMPT_COUNT: '@TrainLCD:portraitPromoPromptCount',
  PORTRAIT_PROMO_PROMPT_LAST_SHOWN_AT:
    '@TrainLCD:portraitPromoPromptLastShownAt',
  PORTRAIT_PROMO_BANNER_COUNT: '@TrainLCD:portraitPromoBannerCount',
  PORTRAIT_PROMO_APPEARANCE_SEEN: '@TrainLCD:portraitPromoAppearanceSeen',
} as const;

export type StorageKeys = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
