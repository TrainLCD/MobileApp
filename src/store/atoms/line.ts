import { atom, type Getter } from 'jotai';
import type { SetStateAction } from 'react';
import type { Line } from '~/@types/graphql';

export interface LineState {
  selectedLine: Line | null;
  pendingLine: Line | null;
}

// フィールド単位のプリミティブatom。読み取りは必ずこちらを購読する。
export const selectedLineAtom = atom<Line | null>(null);
export const pendingLineAtom = atom<Line | null>(null);

const readLineState = (get: Getter): LineState => ({
  selectedLine: get(selectedLineAtom),
  pendingLine: get(pendingLineAtom),
});

// 互換ファサード: 既存の setLineState(prev => ({ ...prev, x })) 形式の
// 書き込みを、変更があったフィールドのatomだけへ分配する。
// 読み取りで購読すると全フィールドの変更で再レンダーされるため、
// 新規コードでの読み取り購読には使わずフィールドatomを使うこと。
const lineState = atom(
  readLineState,
  (get, set, update: SetStateAction<LineState>) => {
    const prev = readLineState(get);
    const next = typeof update === 'function' ? update(prev) : update;
    if (!Object.is(prev.selectedLine, next.selectedLine)) {
      set(selectedLineAtom, next.selectedLine);
    }
    if (!Object.is(prev.pendingLine, next.pendingLine)) {
      set(pendingLineAtom, next.pendingLine);
    }
  }
);

export default lineState;
