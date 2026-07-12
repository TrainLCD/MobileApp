import { atom } from 'jotai';
import { STORAGE_KEYS } from '~/constants/storage';
import { storage } from '~/lib/storage';

// 省電力測位モード。測位精度をBalancedへ下げ、停車中の測位自動休止(iOSのみ)を
// 許可して、長時間乗車時の電池消費・発熱をさらに抑える。旧プロファイルのHigh精度・
// 更新間隔の緩和は実車検証を経て既定値へ昇格済み(constants/location.ts)。
// 「バッテリー」設定から切り替えられる正式機能。手動でONのときに加え、端末の
// 省電力モード中も自動的に同じプロファイルへ切り替わる(useStartBackgroundLocationUpdates)。
// 他の設定と異なり Permitted の loadSettings(effect) では復元せず、MMKVの同期APIで
// 初期値をここで確定する。effect復元だと Main 側の継続測位が一度デフォルト精度で
// 起動→復元後に停止・再起動され、起動のたびに無駄な測位再起動が発生するため。
export const powerSavingLocationEnabledAtom = atom(
  storage.getString(STORAGE_KEYS.POWER_SAVING_LOCATION_ENABLED) === 'true'
);
