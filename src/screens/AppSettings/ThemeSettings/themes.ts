import AppTheme from '../../../models/Theme';
import { translate } from '../../../translation';

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
    label: translate('jrWestLike'),
    value: AppTheme.JRWest,
  },
  {
    label: translate('tyLike'),
    value: AppTheme.TY,
  },
  {
    label: translate('saikyoLineLike'),
    value: AppTheme.Saikyo,
  },
  {
    label: translate('yamanoteLineLike'),
    value: AppTheme.Yamanote,
  },
];

export default getSettingsThemes;
