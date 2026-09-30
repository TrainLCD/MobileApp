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

// 設定の「振り返り」を開いたか。開いた時点で設定リストとフッターの設定タブの印を
// 消す必要があり、印を出す画面(AppSettings / FooterTabBar)は振り返りの設定から
// 戻ってきても再マウントされないため、MMKV の読み取りではなく atom で購読させる。
// 初期値は MMKV の同期APIでここで確定する(印の有無は初回レンダーで確定していないと、
// 一瞬だけ点いて消える)。rideLogEnabledAtom と同じ方式
export const rideLogSettingsSeenAtom = atom(
  storage.getString(STORAGE_KEYS.RIDE_LOG_SETTINGS_SEEN) === 'true'
);
