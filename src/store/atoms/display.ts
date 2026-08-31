import { atom } from 'jotai';

// 画面表示に関する設定。フィールド単位のプリミティブatomとして公開し、
// 読み取りは必ずこちらを購読する(docs/state-management.md 参照)。
export const portraitModeEnabledAtom = atom(false);
