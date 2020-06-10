import { AppTheme, UPDATE_THEME, ThemeActionTypes } from '../types/theme';

const updateAppTheme = (theme: AppTheme): ThemeActionTypes => ({
  type: UPDATE_THEME,
  payload: {
    theme,
  },
});

export default updateAppTheme;
