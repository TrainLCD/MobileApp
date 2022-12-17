export const APP_THEME = {
  TokyoMetro: 'TokyoMetro',
  Yamanote: 'Yamanote',
  JRWest: 'JRWest',
  TY: 'TY',
  Saikyo: 'Saikyo',
  Toei: 'TOei',
} as const;

export type AppTheme = typeof APP_THEME[keyof typeof APP_THEME];
