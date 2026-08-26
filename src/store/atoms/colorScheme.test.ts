import { createStore } from 'jotai';
import { COLOR_SCHEME, COLOR_SCHEME_PREFERENCE } from '~/models/ColorScheme';
import {
  appColorsAtom,
  colorSchemePreferenceAtom,
  isDarkColorSchemeAtom,
  resolvedColorSchemeAtom,
  systemColorSchemeAtom,
} from './colorScheme';

describe('colorScheme atoms', () => {
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

  it('解決した配色に対応するパレットを返す', () => {
    const store = createStore();

    store.set(colorSchemePreferenceAtom, COLOR_SCHEME_PREFERENCE.LIGHT);
    expect(store.get(appColorsAtom).isDark).toBe(false);

    store.set(colorSchemePreferenceAtom, COLOR_SCHEME_PREFERENCE.DARK);
    expect(store.get(appColorsAtom).isDark).toBe(true);
  });
});
