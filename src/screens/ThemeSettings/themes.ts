import i18n from 'i18n-js';
import { AppTheme } from '../../store/types/theme';

interface SettingsTheme {
  label: string;
  value: AppTheme;
}

const settingsThemes: SettingsTheme[] = [
  {
    label: i18n.t('tokyoMetroLike'),
    value: AppTheme.TokyoMetro,
  },
  {
    label: i18n.t('yamanoteLineLike'),
    value: AppTheme.Yamanote,
  },
  {
    label: i18n.t('osakaLoopLineLike'),
    value: AppTheme.OsakaLoopLine,
  },
];

export default settingsThemes;
