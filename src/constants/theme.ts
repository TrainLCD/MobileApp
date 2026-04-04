import { APP_THEME, type AppTheme } from '../models/Theme';

export const TYPE_CHANGE_HIDE_THEMES: AppTheme[] = [
  APP_THEME.JR_WEST,
  APP_THEME.YAMANOTE,
  APP_THEME.E231,
] as const;

export const IN_USE_COLOR_MAP: Record<AppTheme, string> = {
  TOKYO_METRO: '#00a9ce',
  TY: '#dc143c',
  YAMANOTE: '#9acd32',
  JR_WEST: '#0072bc',
  SAIKYO: '#00ac9a',
  TOEI: '#45B035',
  LED: '#212121',
  JO: '#0067C0',
  JL: '#808080',
  JR_KYUSHU: '#E50012',
  ODAKYU: '#0D82C7',
  E231: '#FFD400',
} as const;

export const AUTO_THEME_GRADIENT_COLORS: [string, string] = [
  '#5B9BD5',
  '#A78BCA',
];
