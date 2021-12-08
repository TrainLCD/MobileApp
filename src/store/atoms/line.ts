import { atom } from 'recoil';
import RECOIL_STATES from '../../constants/state';
import { Line } from '../../models/StationAPI';

export interface LineState {
  selectedLine: Line | null;
  // オフライン用
  prevSelectedLine: Line | null;
}

const lineState = atom<LineState>({
  key: RECOIL_STATES.line,
  default: {
    selectedLine: null,
    prevSelectedLine: null,
  },
});

export default lineState;
