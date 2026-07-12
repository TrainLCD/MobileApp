import { atom } from 'jotai';

// 試験的機能のオンオフ。フィールド単位のプリミティブatomとして公開し、
// 読み取りは必ずこちらを購読する(docs/state-management.md 参照)。
export const portraitModeEnabledAtom = atom(false);

// 地下GPS喪失時のETA位置補完(R2フォールバック)を手動で有効化するトグル。
// リモート設定(eta_assist_enabled)だけだと手動A/Bテストがしづらいため、設定画面の
// 試験的機能から個別に切り替えられるようにする。ONのときはリモート設定より優先して
// 有効化する(isEtaAssistEnabled 参照)。
export const etaAssistManualEnabledAtom = atom(false);
