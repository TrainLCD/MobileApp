import { isClip } from 'react-native-app-clip';
import {
  APP_THEME,
  THEME_PREFERENCE,
  type ThemePreference,
} from '~/models/Theme';
import { translate } from '~/translation';
import { isDevApp } from './isDevApp';

export interface SettingsTheme {
  label: string;
  value: ThemePreference;
  devOnly: boolean;
}

export const getSettingsThemes = (): SettingsTheme[] =>
  [
    {
      label: translate('autoTheme'),
      value: THEME_PREFERENCE.AUTO,
      devOnly: false,
    },
    {
      label: translate('tokyoMetroLike'),
      value: APP_THEME.TOKYO_METRO,
      devOnly: false,
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
    {
      label: translate('jrWestLike'),
      value: APP_THEME.JR_WEST,
      devOnly: false,
    },
    {
      label: translate('ledLike'),
      value: APP_THEME.LED,
      devOnly: false,
    },
    {
      label: translate('joLike'),
      value: APP_THEME.JO,
      devOnly: false,
    },
    {
      label: translate('jlLike'),
      value: APP_THEME.JL,
      devOnly: false,
    },
    {
      label: translate('jrKyushuLike'),
      value: APP_THEME.JR_KYUSHU,
      devOnly: false,
    },
    {
      label: translate('odakyuLike'),
      value: APP_THEME.ODAKYU,
      devOnly: false,
    },
    {
      label: translate('e231Like'),
      value: APP_THEME.E231,
      devOnly: false,
    },
    {
      label: translate('lowPowerTheme'),
      value: APP_THEME.LOW_POWER,
      // コードネームは低消費電力テーマ(#3697)。まずカナリア版だけで様子を見る
      devOnly: true,
    },
  ].filter((t) => {
    // App Clip では LED テーマを非表示
    if (isClip() && t.value === APP_THEME.LED) {
      return false;
    }
    // 未公開テーマはカナリア版でのみ選べるようにする。
    // 呼び出し側ごとに除外すると片方だけ漏れるため、一覧を組み立てるここで一元的に落とす
    return isDevApp || !t.devOnly;
  });
