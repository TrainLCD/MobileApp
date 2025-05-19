import { TYPE_CHANGE_HIDE_THEMES } from '../constants';
import { useThemeStore } from './useThemeStore';

export const useShouldHideTypeChange = (): boolean => {
  const theme = useThemeStore();
  return TYPE_CHANGE_HIDE_THEMES.includes(theme);
};
