import { atom } from 'jotai';
import { STORAGE_KEYS } from '~/constants/storage';
import { storage } from '~/lib/storage';

// 振り返り機能で乗車ログを記録するか(#5751)。オプトインで既定はオフ。
// Main 画面の記録ホスト(FxRideRecorder)をこの値でマウントするため、
// effect での復元を待たずに初回レンダーで値が確定するよう MMKV の同期APIで読む
// (powerSavingLocationEnabledAtom と同じ方式)。
export const rideLogEnabledAtom = atom(
  storage.getString(STORAGE_KEYS.RIDE_LOG_ENABLED) === 'true'
);
