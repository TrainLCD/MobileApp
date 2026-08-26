import { atom } from 'jotai';
import { Appearance, type ColorSchemeName } from 'react-native';
import { APP_COLORS, type AppColors } from '~/constants/colorScheme';
import { STORAGE_KEYS } from '~/constants/storage';
import { storage } from '~/lib/storage';
import {
  COLOR_SCHEME,
  COLOR_SCHEME_PREFERENCE,
  type ColorScheme,
  type ColorSchemePreference,
  isColorSchemePreference,
} from '~/models/ColorScheme';

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

export const resolvedColorSchemeAtom = atom<ColorScheme>((get) => {
  const preference = get(colorSchemePreferenceAtom);
  if (preference === COLOR_SCHEME_PREFERENCE.AUTO) {
    return get(systemColorSchemeAtom);
  }
  return preference;
});

export const appColorsAtom = atom<AppColors>(
  (get) => APP_COLORS[get(resolvedColorSchemeAtom)]
);

export const isDarkColorSchemeAtom = atom<boolean>(
  (get) => get(resolvedColorSchemeAtom) === COLOR_SCHEME.DARK
);

export { normalizeSystemScheme };
