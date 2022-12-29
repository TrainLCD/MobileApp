import { AppTheme, APP_THEME } from '../../models/Theme';
import { translate } from '../../translation';

interface SettingsTheme {
  label: string;
  value: AppTheme;
  devOnly: boolean;
}

const getSettingsThemes = (): SettingsTheme[] => [
  {
    label: translate('tokyoMetroLike'),
    value: APP_THEME.TOKYO_METRO,
    devOnly: false,
  },
  {
    label: translate('jrWestLike'),
    value: APP_THEME.JR_WEST,
    devOnly: true,
  },
  {
    label: translate('tyLike'),
    value: APP_THEME.TY,
    devOnly: false,
  },
  {
    label: translate('saikyoLineLike'),
    value: APP_THEME.SAIKYO,
    devOnly: false,
  },
  {
    label: translate('toeiLike'),
    value: APP_THEME.TOEI,
    devOnly: false,
  },
  {
    label: translate('yamanoteLineLike'),
    value: APP_THEME.YAMANOTE,
    devOnly: false,
  },
];

export default getSettingsThemes;
