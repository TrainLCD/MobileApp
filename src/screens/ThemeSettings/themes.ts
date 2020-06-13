import { AppTheme } from '../../store/types/theme';

interface SettingsTheme {
  label: string;
  value: AppTheme;
}

const settingsThemes: SettingsTheme[] = [
  {
    label: '東京メトロ風',
    value: AppTheme.TokyoMetro,
  },
  {
    label: 'JR山手線風',
    value: AppTheme.Yamanote,
  },
  {
    label: '大阪環状線風',
    value: AppTheme.OsakaLoopLine,
  },
];

export default settingsThemes;
