import { atom } from 'jotai';
import type { Line } from '~/gen/proto/stationapi_pb';

export interface LineState {
  selectedLine: Line | null;
}

const lineState = atom<LineState>({
  selectedLine: null,
});

export default lineState;
