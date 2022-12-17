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
    value: APP_THEME.TokyoMetro,
    devOnly: false,
  },
  {
    label: translate('jrWestLike'),
    value: APP_THEME.JRWest,
    devOnly: true,
  },
  {
    label: translate('tyLike'),
    value: APP_THEME.TY,
    devOnly: false,
  },
  {
    label: translate('saikyoLineLike'),
    value: APP_THEME.Saikyo,
    devOnly: false,
  },
  {
    label: translate('toeiLike'),
    value: APP_THEME.Toei,
    devOnly: false,
  },
  {
    label: translate('yamanoteLineLike'),
    value: APP_THEME.Yamanote,
    devOnly: true,
  },
];

export default getSettingsThemes;
