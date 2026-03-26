import { atom } from 'jotai';
import {
  APP_THEME,
  type AppTheme,
  THEME_PREFERENCE,
  type ThemePreference,
} from '../../models/Theme';
import { resolveThemeForLine } from '../../utils/resolveThemeForLine';
import lineState from './line';

export const themePreferenceAtom = atom<ThemePreference>(THEME_PREFERENCE.AUTO);

export const themeAtom = atom<AppTheme>((get) => {
  const preference = get(themePreferenceAtom);
  if (preference !== THEME_PREFERENCE.AUTO) {
    return preference as AppTheme;
  }
  const { selectedLine } = get(lineState);
  return resolveThemeForLine(selectedLine);
});

// 派生atom: LEDテーマかどうか
export const isLEDThemeAtom = atom((get) => get(themeAtom) === APP_THEME.LED);
