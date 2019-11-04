import { ILine } from '../../models/StationAPI';

export const UPDATE_SELECTED_LINE = 'UPDATE_SELECTED_LINE';

export interface IUpdateSelectedLinePayload {
  line: ILine;
}

interface IUpdateSelectedLineAction {
  type: typeof UPDATE_SELECTED_LINE;
  payload: IUpdateSelectedLinePayload;
}

export type LineActionTypes = IUpdateSelectedLineAction;
