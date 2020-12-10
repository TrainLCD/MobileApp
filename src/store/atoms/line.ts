import { atom } from 'recoil';
import RECOIL_STATES from '../../constants/state';
import { Line } from '../../models/StationAPI';

export interface LineState {
  selectedLine: Line;
}

const lineState = atom<LineState>({
  key: RECOIL_STATES.line,
  default: {
    selectedLine: null,
  },
});

export default lineState;
