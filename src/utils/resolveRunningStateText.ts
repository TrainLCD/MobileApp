import { translate } from '~/translation';

// 終着駅の state は横画面ヘッダーの2行組み(例: 「まもなく\n終点」)を前提に
// 改行を含む。ポートレートの state は高さ固定の1行なので、改行をそのまま渡すと
// 2行目が省略記号に化けて「終点」が読めなくなる。空白に畳んで全文を1行で出す。
const flattenStateText = (stateText: string): string =>
  stateText.replaceAll('\n', ' ');

// 停車中(CURRENT)の state は共有の useHeaderStateText では日本語以外が空になる
// (ヘッダーは駅名のみ表示する仕様)。ポートレートと正方形では各言語の「ただいま停車中」を
// 補完して、停車中でも英中韓の state を表示する。
export const resolveRunningStateText = (
  stateText: string,
  headerState: string
): string => {
  if (stateText) {
    return flattenStateText(stateText);
  }
  switch (headerState) {
    case 'CURRENT_EN':
      return flattenStateText(translate('nowStoppingAtEn'));
    case 'CURRENT_ZH':
      return flattenStateText(translate('nowStoppingAtZh'));
    case 'CURRENT_KO':
      return flattenStateText(translate('nowStoppingAtKo'));
    default:
      return stateText;
  }
};
