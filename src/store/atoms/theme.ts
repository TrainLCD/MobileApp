import { atom } from 'recoil';
import RECOIL_STATES from '../../constants/state';
import { AppTheme, APP_THEME } from '../../models/Theme';

export interface StationState {
  theme: AppTheme;
}

const themeState = atom<StationState>({
  key: RECOIL_STATES.theme,
  default: {
    theme: APP_THEME.TOKYO_METRO,
  },
});

export default themeState;
