import { Line } from '../../models/StationAPI';
import { LineActionTypes } from '../types/line';

export interface LineState {
  selectedLine: Line;
}

const initialState: LineState = {
  selectedLine: null,
};

const locationReducer = (
  state = initialState,
  action: LineActionTypes
): LineState => {
  switch (action.type) {
    case 'UPDATE_SELECTED_LINE':
      return {
        ...state,
        selectedLine: action.payload.line,
      };
    default:
      return state;
  }
};

export default locationReducer;
