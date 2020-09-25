import { AppTheme } from '../../store/types/theme';
import getTranslatedText from '../../utils/translate';

interface SettingsTheme {
  label: string;
  value: AppTheme;
}

const settingsThemes: SettingsTheme[] = [
  {
    label: getTranslatedText('tokyoMetroLike'),
    value: AppTheme.TokyoMetro,
  },
  {
    label: getTranslatedText('yamanoteLineLike'),
    value: AppTheme.Yamanote,
  },
  {
    label: getTranslatedText('jrWestLike'),
    value: AppTheme.JRWest,
  },
];

export default settingsThemes;
