import { Line } from '../../models/StationAPI';

export const UPDATE_SELECTED_LINE = 'UPDATE_SELECTED_LINE';

interface UpdateSelectedLinePayload {
  line: Line;
}

export interface UpdateSelectedLineAction {
  type: typeof UPDATE_SELECTED_LINE;
  payload: UpdateSelectedLinePayload;
}

export type LineActionTypes = UpdateSelectedLineAction;
