import { atom } from 'jotai';
import type { Line } from '~/@types/graphql';

export interface LineState {
  selectedLine: Line | null;
  pendingLine: Line | null;
}

const lineState = atom<LineState>({
  selectedLine: null,
  pendingLine: null,
});

export default lineState;
