export const APP_THEME = {
  TOKYO_METRO: 'TOKYO_METRO',
  YAMANOTE: 'YAMANOTE',
  JR_WEST: 'JR_WEST',
  TY: 'TY',
  SAIKYO: 'SAIKYO',
  TOEI: 'TOEI',
  LED: 'LED',
  JO: 'JO',
  JL: 'JL',
  JR_KYUSHU: 'JR_KYUSHU',
  ODAKYU: 'ODAKYU',
} as const;

export type AppTheme = (typeof APP_THEME)[keyof typeof APP_THEME];

export const THEME_PREFERENCE = {
  AUTO: 'AUTO',
  ...APP_THEME,
} as const;

export type ThemePreference =
  (typeof THEME_PREFERENCE)[keyof typeof THEME_PREFERENCE];
