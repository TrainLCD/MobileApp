import { atom } from 'jotai';
import { APP_THEME, type AppTheme } from '../../models/Theme';

export const themeAtom = atom<AppTheme>(APP_THEME.TOKYO_METRO);

// 派生atom: LEDテーマかどうか
export const isLEDThemeAtom = atom((get) => get(themeAtom) === APP_THEME.LED);
