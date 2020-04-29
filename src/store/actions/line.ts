import { Line } from '../../models/StationAPI';
import { LineActionTypes, UPDATE_SELECTED_LINE } from '../types/line';

const updateSelectedLine = (line: Line): LineActionTypes => ({
  type: UPDATE_SELECTED_LINE,
  payload: {
    line,
  },
});

export default updateSelectedLine;
