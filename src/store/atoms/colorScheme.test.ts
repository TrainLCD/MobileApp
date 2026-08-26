import { createStore } from 'jotai';
import { DARK_APP_COLORS, LIGHT_APP_COLORS } from '~/constants/colorScheme';
import { COLOR_SCHEME, COLOR_SCHEME_PREFERENCE } from '~/models/ColorScheme';
import { THEME_PREFERENCE } from '~/models/Theme';
import {
  appColorsAtom,
  colorSchemePreferenceAtom,
  isDarkColorSchemeAtom,
  overlayAppColorsAtom,
  resolvedColorSchemeAtom,
  systemColorSchemeAtom,
} from './colorScheme';
import { themePreferenceAtom } from './theme';

describe('colorScheme atoms', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('自動設定では端末の配色に追従する', () => {
    const store = createStore();
    store.set(colorSchemePreferenceAtom, COLOR_SCHEME_PREFERENCE.AUTO);

    store.set(systemColorSchemeAtom, COLOR_SCHEME.DARK);
    expect(store.get(resolvedColorSchemeAtom)).toBe(COLOR_SCHEME.DARK);
    expect(store.get(isDarkColorSchemeAtom)).toBe(true);

    store.set(systemColorSchemeAtom, COLOR_SCHEME.LIGHT);
    expect(store.get(resolvedColorSchemeAtom)).toBe(COLOR_SCHEME.LIGHT);
    expect(store.get(isDarkColorSchemeAtom)).toBe(false);
  });

  it('ライト・ダークを明示した場合は端末の配色を無視する', () => {
    const store = createStore();
    store.set(systemColorSchemeAtom, COLOR_SCHEME.DARK);

    store.set(colorSchemePreferenceAtom, COLOR_SCHEME_PREFERENCE.LIGHT);
    expect(store.get(resolvedColorSchemeAtom)).toBe(COLOR_SCHEME.LIGHT);

    store.set(systemColorSchemeAtom, COLOR_SCHEME.LIGHT);
    store.set(colorSchemePreferenceAtom, COLOR_SCHEME_PREFERENCE.DARK);
    expect(store.get(resolvedColorSchemeAtom)).toBe(COLOR_SCHEME.DARK);
  });

  // 電光掲示板風テーマは全画面で独自の配色を持つため、ダークモード設定の影響を受けない
  it('電光掲示板風テーマ選択中はダークを選んでもライトのパレットを返す', () => {
    const store = createStore();
    store.set(themePreferenceAtom, THEME_PREFERENCE.LED);
    store.set(colorSchemePreferenceAtom, COLOR_SCHEME_PREFERENCE.DARK);

    expect(store.get(appColorsAtom)).toBe(LIGHT_APP_COLORS);
    expect(store.get(isDarkColorSchemeAtom)).toBe(false);
    // 設定値そのものは保持され、他のテーマへ戻せばダークが適用される
    expect(store.get(resolvedColorSchemeAtom)).toBe(COLOR_SCHEME.DARK);

    store.set(themePreferenceAtom, THEME_PREFERENCE.TOKYO_METRO);
    expect(store.get(isDarkColorSchemeAtom)).toBe(true);
  });

  // アクションシートなどOS側のレイヤーに描かれるUIは、電光掲示板風テーマの
  // 配色を持ちようがないため設定値をそのまま反映する
  it('overlayAppColorsAtomは電光掲示板風テーマでも配色設定に追従する', () => {
    const store = createStore();
    store.set(themePreferenceAtom, THEME_PREFERENCE.LED);

    store.set(colorSchemePreferenceAtom, COLOR_SCHEME_PREFERENCE.DARK);
    expect(store.get(overlayAppColorsAtom)).toBe(DARK_APP_COLORS);
    // 画面本体側は従来どおりライトのまま
    expect(store.get(appColorsAtom)).toBe(LIGHT_APP_COLORS);

    store.set(colorSchemePreferenceAtom, COLOR_SCHEME_PREFERENCE.LIGHT);
    expect(store.get(overlayAppColorsAtom)).toBe(LIGHT_APP_COLORS);
  });

  it('電光掲示板風テーマ選択中は端末がダークでもライトのパレットを返す', () => {
    const store = createStore();
    store.set(themePreferenceAtom, THEME_PREFERENCE.LED);
    store.set(colorSchemePreferenceAtom, COLOR_SCHEME_PREFERENCE.AUTO);
    store.set(systemColorSchemeAtom, COLOR_SCHEME.DARK);

    expect(store.get(appColorsAtom)).toBe(LIGHT_APP_COLORS);
  });

  it('解決した配色に対応するパレットを返す', () => {
    const store = createStore();

    store.set(colorSchemePreferenceAtom, COLOR_SCHEME_PREFERENCE.LIGHT);
    expect(store.get(appColorsAtom).isDark).toBe(false);

    store.set(colorSchemePreferenceAtom, COLOR_SCHEME_PREFERENCE.DARK);
    expect(store.get(appColorsAtom).isDark).toBe(true);
  });
});
