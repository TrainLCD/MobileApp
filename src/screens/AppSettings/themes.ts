import AppTheme from '../../models/Theme';
import { translate } from '../../translation';

interface SettingsTheme {
  label: string;
  value: AppTheme;
  devOnly: boolean;
}

const getSettingsThemes = (): SettingsTheme[] => [
  {
    label: translate('tokyoMetroLike'),
    value: AppTheme.TokyoMetro,
    devOnly: false,
  },
  {
    label: translate('jrWestLike'),
    value: AppTheme.JRWest,
    devOnly: true,
  },
  {
    label: translate('tyLike'),
    value: AppTheme.TY,
    devOnly: false,
  },
  {
    label: translate('saikyoLineLike'),
    value: AppTheme.Saikyo,
    devOnly: false,
  },
  {
    label: translate('toeiLike'),
    value: AppTheme.Toei,
    devOnly: false,
  },
  {
    label: translate('yamanoteLineLike'),
    value: AppTheme.Yamanote,
    devOnly: true,
  },
];

export default getSettingsThemes;
