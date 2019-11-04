import { ILine } from '../../models/StationAPI';
import { LineActionTypes } from '../types/line';

export interface ILineState {
  selectedLine: ILine;
}

const initialState: ILineState = {
  selectedLine: null,
};

const locationReducer = (
  state = initialState,
  action: LineActionTypes,
): ILineState => {
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
