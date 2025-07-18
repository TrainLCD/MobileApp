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
} as const;

export type AppTheme = (typeof APP_THEME)[keyof typeof APP_THEME];
