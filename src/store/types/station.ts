import { LineDirection } from '../../models/Bound';
import { Station } from '../../models/StationAPI';

export const FETCH_STATION_START = 'FETCH_STATION_START';
export const FETCH_STATION_SUCCESS = 'FETCH_STATION_SUCCESS';
export const FETCH_STATION_FAILED = 'FETCH_STATION_FAILED';

export const FETCH_STATION_LIST_START = 'FETCH_STATION_LIST_START';
export const FETCH_STATION_LIST_SUCCESS = 'FETCH_STATION_LIST_SUCCESS';
export const FETCH_STATION_LIST_FAILED = 'FETCH_STATION_LIST_FAILED';

export const UPDATE_SCORED_STATIONS = 'UPDATE_SCORED_STATIONS';

export const REFRESH_NEAREST_STATION = 'REFRESH_NEAREST_STATION';

export const UPDATE_ARRIVED = 'UPDATE_ARRIVED';

export const UPDATE_APPROACHING = 'UPDATE_APPROACHING';

export const UPDATE_SELECTED_DIRECTION = 'UPDATE_SELECTED_DIRECTION';

export const UPDATE_SELECTED_BOUND = 'UPDATE_SELECTED_BOUND';

interface FetchStationStartAction {
  type: typeof FETCH_STATION_START;
}

interface FetchStationSuccessPayload {
  station: Station;
}

interface FetchStationSuccessAction {
  type: typeof FETCH_STATION_SUCCESS;
  payload: FetchStationSuccessPayload;
}

interface FetchStationFailedPayload {
  error: Error;
}

interface FetchStationFailedAction {
  type: typeof FETCH_STATION_FAILED;
  payload: FetchStationFailedPayload;
}

interface FetchStationListStartAction {
  type: typeof FETCH_STATION_LIST_START;
}

interface FetchStationListSuccessPayload {
  stations: Station[];
}

interface FetchStationListSuccessAction {
  type: typeof FETCH_STATION_LIST_SUCCESS;
  payload: FetchStationListSuccessPayload;
}

interface FetchStationListFailedPayload {
  error: Error;
}

interface FetchStationListFailedAction {
  type: typeof FETCH_STATION_LIST_FAILED;
  payload: FetchStationListFailedPayload;
}

interface RefreshNearestStationPayload {
  station: Station;
}

interface RefreshNearestStationAction {
  type: typeof REFRESH_NEAREST_STATION;
  payload: RefreshNearestStationPayload;
}

interface UpdateArrivedPayload {
  arrived: boolean;
}

interface UpdateArrivedAction {
  type: typeof UPDATE_ARRIVED;
  payload: UpdateArrivedPayload;
}

interface UpdateScoredStationsPayload {
  stations: Station[];
}

interface UpdateScoredStationsAction {
  type: typeof UPDATE_SCORED_STATIONS;
  payload: UpdateScoredStationsPayload;
}

interface UpdateApproachingPayload {
  approaching: boolean;
}

interface UpdateApproachingAction {
  type: typeof UPDATE_APPROACHING;
  payload: UpdateApproachingPayload;
}

interface UpdateSelectedDirectionPayload {
  direction: LineDirection;
}

interface UpdateSelectedDirectionAction {
  type: typeof UPDATE_SELECTED_DIRECTION;
  payload: UpdateSelectedDirectionPayload;
}

interface UpdateSelectedBoundPayload {
  station: Station;
}

interface UpdateSelectedBoundAction {
  type: typeof UPDATE_SELECTED_BOUND;
  payload: UpdateSelectedBoundPayload;
}

export type StationActionTypes =
  | FetchStationStartAction
  | FetchStationSuccessAction
  | FetchStationFailedAction
  | FetchStationListStartAction
  | FetchStationListSuccessAction
  | FetchStationListFailedAction
  | RefreshNearestStationAction
  | UpdateArrivedAction
  | UpdateScoredStationsAction
  | UpdateApproachingAction
  | UpdateSelectedDirectionAction
  | UpdateSelectedBoundAction;
