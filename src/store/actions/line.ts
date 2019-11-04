import { ILine } from '../../models/StationAPI';
import { LineActionTypes, UPDATE_SELECTED_LINE } from '../types/line';

export const updateSelectedLine = (
  line: ILine,
): LineActionTypes => ({
  type: UPDATE_SELECTED_LINE,
  payload: {
    line,
  },
});
