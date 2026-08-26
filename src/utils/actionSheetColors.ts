import type { ActionSheetOptions } from '@expo/react-native-action-sheet';
import type { AppColors } from '~/constants/colorScheme';

/**
 * アクションシートへ配色設定を反映するためのオプション。
 *
 * iOS は端末ネイティブのシートなので `userInterfaceStyle` だけが効き、
 * スタイル系のキーは無視される。Android は JS 実装のシートなので逆に
 * スタイル系だけが効く。そのため両方を一度に渡している。
 *
 * ライト時はライブラリ既定値をそのまま使い、導入前と完全に同じ見た目を保つ。
 * ただし iOS のネイティブシートは既定で端末の外観に追従してしまうため、
 * ライトでも `userInterfaceStyle` を明示してアプリ側の設定を優先させる。
 *
 * 電光掲示板風テーマ中は何も指定せず、導入前と完全に同じ挙動
 * (iOS は端末の外観に追従、Android はライブラリ既定値)を保つ。
 */
export const getActionSheetColorOptions = (
  colors: AppColors,
  isLEDTheme: boolean
): Partial<ActionSheetOptions> => {
  if (isLEDTheme) {
    return {};
  }

  if (!colors.isDark) {
    return { userInterfaceStyle: 'light' };
  }

  return {
    userInterfaceStyle: 'dark',
    containerStyle: { backgroundColor: colors.card },
    textStyle: { color: colors.text },
    titleTextStyle: { color: colors.secondaryText },
    messageTextStyle: { color: colors.secondaryText },
    separatorStyle: { backgroundColor: colors.border },
  };
};
