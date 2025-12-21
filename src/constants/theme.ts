import { APP_THEME, type AppTheme } from '../models/Theme';

export const TYPE_CHANGE_HIDE_THEMES: AppTheme[] = [
  APP_THEME.JR_WEST,
  APP_THEME.YAMANOTE,
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
} as const;
