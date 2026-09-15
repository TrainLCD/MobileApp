import * as Clipboard from 'expo-clipboard';

/**
 * 文字列をクリップボードへ載せる。載せられたかどうかを返す。
 *
 * react-native の Clipboard は core から切り出され「将来のリリースで削除する」と
 * 予告されている(参照するとその旨の警告が出る)。新しく使い始める先としては選ばない。
 *
 * 呼び出し側をこの1か所に閉じてあるので、載せ方を変えるときはこの関数の中だけで済む。
 * 用途は DevOverlay の診断情報の持ち出しに限る(本番の画面からは呼ばない)。
 */
export const copyTextToClipboard = async (text: string): Promise<boolean> => {
  try {
    return await Clipboard.setStringAsync(text);
  } catch (error) {
    console.warn('クリップボードへのコピーに失敗しました:', error);
    return false;
  }
};
