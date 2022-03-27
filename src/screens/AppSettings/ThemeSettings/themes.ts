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
    label: translate('tyLike'),
    value: AppTheme.TY,
  },
  {
    label: translate('saikyoLineLike'),
    value: AppTheme.Saikyo,
  },
];

export default getSettingsThemes;
