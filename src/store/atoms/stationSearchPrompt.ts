import { atom } from 'jotai';

// 現在駅を手動で選ぶ「駅名で検索」モーダルの開閉。モーダルの実体は NowHeader が持つが、
// 現在駅が無いときの案内カードや検索ボタンなど、ヘッダー以外からも開けるようにここで共有する。
export const stationSearchModalVisibleAtom = atom(false);

// 起動時の現在駅の解決に失敗したか。位置情報の取得失敗(設定ダイアログを断った、
// 測位が取れない)と最寄り駅APIの失敗・該当なしのどれでも true になる。
// NowHeader が「取得中のスケルトンを出し続ける」か「駅名検索を促す」かの分岐に使う。
export const stationResolveFailedAtom = atom(false);
