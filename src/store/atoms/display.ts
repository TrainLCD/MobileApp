import { atom } from 'jotai';
import { STORAGE_KEYS } from '~/constants/storage';
import { storage } from '~/lib/storage';

// 画面表示に関する設定。フィールド単位のプリミティブatomとして公開し、
// 読み取りは必ずこちらを購読する(docs/state-management.md 参照)。
export const portraitModeEnabledAtom = atom(false);

// 訴求を打ち切ったか。ポートレートモードを一度オンにすると立ち、以降は
// オフに戻されても復活させない。オン→オフを同一セッション中にされても
// バナーやプロンプトが戻ってこないよう、マウント時の値ではなくatomで購読する。
// 初期値の確定方法は上と同じ。
export const portraitPromoFinishedAtom = atom(
  storage.getString(STORAGE_KEYS.PORTRAIT_PROMO_FINISHED) === 'true'
);
