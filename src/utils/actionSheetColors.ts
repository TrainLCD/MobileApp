import type { ActionSheetOptions } from '@expo/react-native-action-sheet';
import type { AppColors } from '~/constants/colorScheme';

/**
 * アクションシートへ配色設定を反映するためのオプション。
 *
 * iOS は端末ネイティブのシートなので `userInterfaceStyle` だけが効き、
 * スタイル系のキーは無視される。Android は JS 実装のシートなので逆に
 * スタイル系だけが効く。そのため両方を一度に渡している。
 *
 * ライト時はスタイルを指定せずライブラリ既定値のままにして、導入前と同じ
 * 見た目を保つ。ただし iOS のネイティブシートは既定で端末の外観に追従して
 * しまうため、ライトでも `userInterfaceStyle` だけは明示してアプリ側の設定を
 * 優先させる。
 *
 * アクションシートは OS 側のレイヤーに描かれ電光掲示板風テーマの配色を持ち
 * ようがないため、ここだけは電光掲示板風テーマでも配色設定に追従させる
 * (`resolvedAppColorsAtom` を渡す)。追従しないと他がダークなのにシートだけ
 * 明るいという不具合に見えてしまう。
 */
export const getActionSheetColorOptions = (
  colors: AppColors
): Partial<ActionSheetOptions> => {
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
