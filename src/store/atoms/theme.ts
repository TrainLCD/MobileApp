import { atom } from 'recoil';
import RECOIL_STATES from '../../constants/state';
import AppTheme from '../../models/Theme';

export interface StationState {
  theme: AppTheme;
}

const themeState = atom<StationState>({
  key: RECOIL_STATES.theme,
  default: {
    theme: AppTheme.TokyoMetro,
  },
});

export default themeState;
