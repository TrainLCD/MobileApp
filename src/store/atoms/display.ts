import { atom } from 'jotai';
import { STORAGE_KEYS } from '~/constants/storage';
import { storage } from '~/lib/storage';

// 画面表示に関する設定。フィールド単位のプリミティブatomとして公開し、
// 読み取りは必ずこちらを購読する(docs/state-management.md 参照)。
export const portraitModeEnabledAtom = atom(false);

// 外観画面を開いたか。開いた時点で設定リストとタブの印を消す必要があり、
// 印を出す画面(AppSettings / FooterTabBar)は外観画面から戻ってきても
// 再マウントされないため、MMKVの読み取りではなくatomで購読させる。
// powerSavingLocationEnabledAtom と同じく、初期値はMMKVの同期APIでここで確定する
// (印の有無は初回レンダーで確定していないと、一瞬だけ点いて消える)。
export const portraitPromoAppearanceSeenAtom = atom(
  storage.getString(STORAGE_KEYS.PORTRAIT_PROMO_APPEARANCE_SEEN) === 'true'
);
