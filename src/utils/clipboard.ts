import { Clipboard } from 'react-native';

/**
 * 文字列をクリップボードへ載せる。
 *
 * react-native の Clipboard は core から切り出され「将来のリリースで削除する」と
 * 予告されている(参照するとその旨の警告が出る)。本来は expo-clipboard へ移すべきだが、
 * ネイティブモジュールの追加になり、Devクライアントのリビルドとロックファイルの更新を伴う。
 * まずは依存を増やさずに済むこちらを使う。呼び出し側をこの1か所に閉じてあるので、
 * expo-clipboard を入れるときはこの関数の中だけを差し替えればよい。
 *
 * 用途は DevOverlay の診断情報の持ち出しに限る(本番の画面からは呼ばない)。
 */
export const copyTextToClipboard = (text: string): void => {
  Clipboard.setString(text);
};
