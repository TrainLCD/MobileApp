import { atom } from 'jotai';
import { STORAGE_KEYS } from '~/constants/storage';
import { storage } from '~/lib/storage';

// 試験的機能のオンオフ。フィールド単位のプリミティブatomとして公開し、
// 読み取りは必ずこちらを購読する(docs/state-management.md 参照)。
export const portraitModeEnabledAtom = atom(false);

// 地下GPS喪失時のETA位置補完(R2フォールバック)を手動で有効化するトグル。
// リモート設定(eta_assist_enabled)だけだと手動A/Bテストがしづらいため、設定画面の
// 試験的機能から個別に切り替えられるようにする。ONのときはリモート設定より優先して
// 有効化する(isEtaAssistEnabled 参照)。
export const etaAssistManualEnabledAtom = atom(false);

// 省電力測位モード。継続測位の要求精度を LOCATION_ACCURACY_POWER_SAVING へ下げ、
// 長時間乗車時の電池消費・発熱を抑える。実効差があるのはiOSのみ
// (constants/location.ts のコメント参照)。到着判定への影響を実車で検証するため
// 実験的機能としてトグル化する。
// 他の設定と異なり Permitted の loadSettings(effect) では復元せず、MMKVの同期APIで
// 初期値をここで確定する。effect復元だと Main 側の継続測位が一度デフォルト精度で
// 起動→復元後に停止・再起動され、起動のたびに無駄な測位再起動が発生するため。
export const powerSavingLocationEnabledAtom = atom(
  storage.getString(STORAGE_KEYS.POWER_SAVING_LOCATION_ENABLED) === 'true'
);
