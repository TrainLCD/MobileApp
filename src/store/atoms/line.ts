import { atom } from 'jotai';
import type { Line } from '~/@types/graphql';

export interface LineState {
  selectedLine: Line | null;
}

const lineState = atom<LineState>({
  selectedLine: null,
});

export default lineState;
