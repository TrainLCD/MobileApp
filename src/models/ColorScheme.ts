/**
 * 操作系画面(設定・路線選択・経路検索など)の配色モード。
 * 走行画面(Main)は路線テーマ(models/Theme.ts)で配色が決まるため対象外。
 */
export const COLOR_SCHEME = {
  LIGHT: 'LIGHT',
  DARK: 'DARK',
} as const;

export type ColorScheme = (typeof COLOR_SCHEME)[keyof typeof COLOR_SCHEME];

/** ユーザーが設定画面で選ぶ値。AUTO は端末のダークモード設定へ追従する */
export const COLOR_SCHEME_PREFERENCE = {
  AUTO: 'AUTO',
  ...COLOR_SCHEME,
} as const;

export type ColorSchemePreference =
  (typeof COLOR_SCHEME_PREFERENCE)[keyof typeof COLOR_SCHEME_PREFERENCE];

export const isColorSchemePreference = (
  value: unknown
): value is ColorSchemePreference =>
  typeof value === 'string' &&
  Object.values(COLOR_SCHEME_PREFERENCE).includes(
    value as ColorSchemePreference
  );
