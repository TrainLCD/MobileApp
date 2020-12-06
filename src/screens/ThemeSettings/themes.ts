import AppTheme from '../../models/Theme';
import { translate } from '../../translation';

interface SettingsTheme {
  label: string;
  value: AppTheme;
}

const getSettingsThemes = (): SettingsTheme[] => [
  {
    label: translate('tokyoMetroLike'),
    value: AppTheme.TokyoMetro,
  },
  {
    label: translate('yamanoteLineLike'),
    value: AppTheme.Yamanote,
  },
  {
    label: translate('jrWestLike'),
    value: AppTheme.JRWest,
  },
  {
    label: translate('dtLike'),
    value: AppTheme.DT,
  },
];

export default getSettingsThemes;
