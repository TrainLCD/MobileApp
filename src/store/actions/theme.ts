import { AppTheme, UPDATE_THEME, ThemeActionTypes } from '../types/theme';

const updateSelectedLine = (theme: AppTheme): ThemeActionTypes => ({
  type: UPDATE_THEME,
  payload: {
    theme,
  },
});

export default updateSelectedLine;
