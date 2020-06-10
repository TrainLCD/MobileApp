import { AppTheme, ThemeActionTypes } from '../types/theme';

export interface ThemeState {
  theme: AppTheme;
}

const initialState: ThemeState = {
  theme: AppTheme.Yamanote, // FIXME: TokyoMetroに戻す
};

const themeReducer = (
  state = initialState,
  action: ThemeActionTypes
): ThemeState => {
  switch (action.type) {
    case 'UPDATE_THEME':
      return {
        ...state,
        theme: action.payload.theme,
      };
    default:
      return state;
  }
};

export default themeReducer;
