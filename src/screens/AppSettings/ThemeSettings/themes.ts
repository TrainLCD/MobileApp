import AppTheme from '../../../models/Theme';
import { translate } from '../../../translation';

interface SettingsTheme {
  label: string;
  value: AppTheme;
}

const settingsThemes: SettingsTheme[] = (() => [
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
    label: translate('tyLike'),
    value: AppTheme.TY,
  },
  {
    label: translate('saikyoLineLike'),
    value: AppTheme.Saikyo,
  },
])();

export default settingsThemes;
