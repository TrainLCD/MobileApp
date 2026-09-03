import { atom } from 'jotai';
import { Appearance, type ColorSchemeName } from 'react-native';
import {
  APP_COLORS,
  type AppColors,
  LIGHT_APP_COLORS,
} from '~/constants/colorScheme';
import { STORAGE_KEYS } from '~/constants/storage';
import { storage } from '~/lib/storage';
import {
  COLOR_SCHEME,
  COLOR_SCHEME_PREFERENCE,
  type ColorScheme,
  type ColorSchemePreference,
  isColorSchemePreference,
} from '~/models/ColorScheme';
import { isLEDThemeAtom } from './theme';

const restorePreference = (): ColorSchemePreference => {
  const stored = storage.getString(STORAGE_KEYS.COLOR_SCHEME_PREFERENCE);
  return isColorSchemePreference(stored)
    ? stored
    : COLOR_SCHEME_PREFERENCE.AUTO;
};

const normalizeSystemScheme = (
  scheme: ColorSchemeName | null | undefined
): ColorScheme => (scheme === 'dark' ? COLOR_SCHEME.DARK : COLOR_SCHEME.LIGHT);

/**
 * 操作系画面の配色設定。他の設定と異なり Permitted の loadSettings(effect) では
 * 復元せず、MMKVの同期APIで初期値をここで確定する。effect復元だと初回フレームだけ
 * ライトで描画されてしまい、ダーク設定時に白い画面が一瞬光るため。
 */
export const colorSchemePreferenceAtom = atom<ColorSchemePreference>(
  restorePreference()
);

/** 端末側のダークモード状態。FxSystemColorScheme が Appearance の変化を書き込む */
export const systemColorSchemeAtom = atom<ColorScheme>(
  normalizeSystemScheme(Appearance.getColorScheme())
);

/** 端末設定とユーザー設定だけから決まる配色。電光掲示板風テーマの有無は考慮しない */
export const resolvedColorSchemeAtom = atom<ColorScheme>((get) => {
  const preference = get(colorSchemePreferenceAtom);
  if (preference === COLOR_SCHEME_PREFERENCE.AUTO) {
    return get(systemColorSchemeAtom);
  }
  return preference;
});

/**
 * 実際に適用する配色。
 *
 * 電光掲示板風テーマは行先表示器を模した独自の配色を全画面で持っており、ダークモードと
 * 併用すると意図しない色の混在が起きる。そのため電光掲示板風テーマ選択中はダークモード設定を
 * 無視してライトの値を返し、電光掲示板風テーマの見た目を従来のまま保つ。
 * 各コンポーネントに残っている `isLEDTheme ? ... : colors.x` の分岐と合わせて、
 * 電光掲示板風テーマ時はこの機能導入前と完全に同じ色になる。
 */
export const appColorsAtom = atom<AppColors>((get) => {
  if (get(isLEDThemeAtom)) {
    return LIGHT_APP_COLORS;
  }
  return APP_COLORS[get(resolvedColorSchemeAtom)];
});

/**
 * 電光掲示板風テーマの上書きを受けない配色。
 *
 * 電光掲示板風テーマの配色を持ちようがない UI で使う。次の 2 種類がある。
 *
 * - アクションシートのように OS 側のレイヤーへ描かれるもの
 * - ポートレートモードの走行画面のように、路線テーマに依存しないレイアウト
 *
 * ここまで `appColorsAtom` に合わせてしまうと、他がダークなのにその部分だけ
 * 明るいという不具合に見えるため、テーマではなく設定値をそのまま反映する。
 */
export const resolvedAppColorsAtom = atom<AppColors>(
  (get) => APP_COLORS[get(resolvedColorSchemeAtom)]
);

export const isDarkColorSchemeAtom = atom<boolean>(
  (get) => get(appColorsAtom).isDark
);

export { normalizeSystemScheme };
