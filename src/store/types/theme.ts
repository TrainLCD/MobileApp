export const UPDATE_THEME = 'UPDATE_THEME';

export enum AppTheme {
  TokyoMetro,
  Yamanote,
}

interface UpdateThemeActionPayload {
  theme: AppTheme;
}

export interface UpdateThemeActionAction {
  type: typeof UPDATE_THEME;
  payload: UpdateThemeActionPayload;
}

export type ThemeActionTypes = UpdateThemeActionAction;
