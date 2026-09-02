import { createStore } from 'jotai';
import { STORAGE_KEYS } from '~/constants';
import { DARK_APP_COLORS, LIGHT_APP_COLORS } from '~/constants/colorScheme';
import { COLOR_SCHEME, COLOR_SCHEME_PREFERENCE } from '~/models/ColorScheme';
import { THEME_PREFERENCE } from '~/models/Theme';
import {
  appColorsAtom,
  colorSchemePreferenceAtom,
  isDarkColorSchemeAtom,
  resolvedAppColorsAtom,
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
  it('resolvedAppColorsAtomは電光掲示板風テーマでも配色設定に追従する', () => {
    const store = createStore();
    store.set(themePreferenceAtom, THEME_PREFERENCE.LED);

    store.set(colorSchemePreferenceAtom, COLOR_SCHEME_PREFERENCE.DARK);
    expect(store.get(resolvedAppColorsAtom)).toBe(DARK_APP_COLORS);
    // 画面本体側は従来どおりライトのまま
    expect(store.get(appColorsAtom)).toBe(LIGHT_APP_COLORS);

    store.set(colorSchemePreferenceAtom, COLOR_SCHEME_PREFERENCE.LIGHT);
    expect(store.get(resolvedAppColorsAtom)).toBe(LIGHT_APP_COLORS);
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

// 保存値の読み出しはモジュール評価時に一度だけ走るため、分離した registry の
// 中で MMKV を仕込んでから読み込む。registry ごとに storage も作り直されるので、
// 仕込みも同じ registry の中で行う必要がある
const loadAtoms = (stored?: string) => {
  let atoms!: typeof import('./colorScheme');
  jest.isolateModules(() => {
    if (stored !== undefined) {
      const { storage: isolatedStorage } = require('~/lib/storage');
      isolatedStorage.set(STORAGE_KEYS.COLOR_SCHEME_PREFERENCE, stored);
    }
    atoms = require('./colorScheme');
  });
  return atoms;
};

describe('起動時の設定復元', () => {
  it('保存済みの設定を初期値として復元する', () => {
    const atoms = loadAtoms(COLOR_SCHEME_PREFERENCE.DARK);

    expect(createStore().get(atoms.colorSchemePreferenceAtom)).toBe(
      COLOR_SCHEME_PREFERENCE.DARK
    );
  });

  it('未保存の場合は自動になる', () => {
    const atoms = loadAtoms();

    expect(createStore().get(atoms.colorSchemePreferenceAtom)).toBe(
      COLOR_SCHEME_PREFERENCE.AUTO
    );
  });

  // 手動編集や旧バージョンの値が残っていても起動できるようにする
  it('未知の値が保存されていても自動へフォールバックする', () => {
    const atoms = loadAtoms('sepia');

    expect(createStore().get(atoms.colorSchemePreferenceAtom)).toBe(
      COLOR_SCHEME_PREFERENCE.AUTO
    );
  });
});
