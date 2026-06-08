import { useAtomValue } from 'jotai';
import { TYPE_CHANGE_HIDE_THEMES } from '../constants';
import { themeAtom } from '../store/atoms/theme';

export const useShouldHideTypeChange = (): boolean => {
  const theme = useAtomValue(themeAtom);
  return TYPE_CHANGE_HIDE_THEMES.includes(theme);
};
