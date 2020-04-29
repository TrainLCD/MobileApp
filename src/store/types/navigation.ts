import { BottomTransitionState } from '../../models/BottomTransitionState';
import { HeaderTransitionState } from '../../models/HeaderTransitionState';
import { Station } from '../../models/StationAPI';

export const REFRESH_LEFT_STATIONS = 'REFRESH_LEFT_STATIONS';
export const REFRESH_HEADER_STATE = 'REFRESH_HEADER_STATE';
export const REFRESH_BOTTOM_STATE = 'REFRESH_BOTTOM_STATE';
export const UPDATE_REFRESH_HEADER_STATE_INTERVAL_IDS =
  'UPDATE_REFRESH_HEADER_STATE_INTERVAL_IDS';

export interface RefreshLeftStationsPayload {
  stations: Station[];
}

export interface RefreshLeftStationsAction {
  type: typeof REFRESH_LEFT_STATIONS;
  payload: RefreshLeftStationsPayload;
}

interface RefreshHeaderStatePayload {
  state: HeaderTransitionState;
}

interface RefreshHeaderStateAction {
  type: typeof REFRESH_HEADER_STATE;
  payload: RefreshHeaderStatePayload;
}

interface RefreshBottomStatePayload {
  state: BottomTransitionState;
}

interface RefrehBottomStateAction {
  type: typeof REFRESH_BOTTOM_STATE;
  payload: RefreshBottomStatePayload;
}

interface UpdateRefreshHeaderStateIntervalIdPayload {
  ids: NodeJS.Timeout[];
}

interface UpdateRefreshHeaderStateIntervalIdAction {
  type: typeof UPDATE_REFRESH_HEADER_STATE_INTERVAL_IDS;
  payload: UpdateRefreshHeaderStateIntervalIdPayload;
}

export type NavigationActionTypes =
  | RefreshLeftStationsAction
  | RefreshHeaderStateAction
  | RefrehBottomStateAction
  | UpdateRefreshHeaderStateIntervalIdAction;
