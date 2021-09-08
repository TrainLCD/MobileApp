import { useRecoilValue } from 'recoil';
import { TYPE_CHANGE_HIDE_THEMES } from '../constants';
import themeState from '../store/atoms/theme';

const useShouldHideTypeChange = (): boolean => {
  const { theme } = useRecoilValue(themeState);
  return TYPE_CHANGE_HIDE_THEMES.includes(theme);
};

export default useShouldHideTypeChange;
