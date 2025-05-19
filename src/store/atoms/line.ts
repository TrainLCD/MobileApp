import { atom } from 'recoil';
import { RECOIL_STATES } from '~/constants';
import type { Line } from '~/gen/proto/stationapi_pb';

export interface LineState {
  selectedLine: Line | null;
}

const lineState = atom<LineState>({
  key: RECOIL_STATES.line,
  default: {
    selectedLine: null,
  },
});

export default lineState;
