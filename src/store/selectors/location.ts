import { atom } from 'jotai';
import { locationAtom } from '~/store/atoms/location';

// locationAtomはGPS更新が受理されるたびに新オブジェクトへ置き換わる。
// 精度だけが必要な購読者が座標変化のたびに再レンダーされないよう、
// accuracyのみを切り出した派生atomを提供する。
// (派生atomは算出結果がObject.isで前回と同一なら購読者へ通知しない)
export const locationAccuracyAtom = atom(
  (get) => get(locationAtom)?.coords.accuracy ?? null
);
