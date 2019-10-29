import { IStation } from '../../models/StationAPI';

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

interface IFetchStationStartAction {
  type: typeof FETCH_STATION_START;
}

interface IFetchStationSuccessPayload {
  station: IStation;
}

interface IFetchStationSuccessAction {
  type: typeof FETCH_STATION_SUCCESS;
  payload: IFetchStationSuccessPayload;
}

interface IFetchStationFailedPayload {
  error: Error;
}

interface IFetchStationFailedAction {
  type: typeof FETCH_STATION_FAILED;
  payload: IFetchStationFailedPayload;
}

interface IFetchStationListStartAction {
  type: typeof FETCH_STATION_LIST_START;
}

interface IFetchStationListSuccessPayload {
  stations: IStation[];
}

interface IFetchStationListSuccessAction {
  type: typeof FETCH_STATION_LIST_SUCCESS;
  payload: IFetchStationListSuccessPayload;
}

interface IFetchStationListFailedPayload {
  error: Error;
}

interface IFetchStationListFailedAction {
  type: typeof FETCH_STATION_LIST_FAILED;
  payload: IFetchStationListFailedPayload;
}

interface IRefreshNearestStationPayload {
  station: IStation;
}

interface IRefreshNearestStationAction {
  type: typeof REFRESH_NEAREST_STATION;
  payload: IRefreshNearestStationPayload;
}

interface IUpdateArrivedPayload {
  arrived: boolean;
}

interface IUpdateArrivedAction {
  type: typeof UPDATE_ARRIVED;
  payload: IUpdateArrivedPayload;
}

interface IUpdateScoredStationsPayload {
  stations: IStation[];
}

interface IUpdateScoredStationsAction {
  type: typeof UPDATE_SCORED_STATIONS;
  payload: IUpdateScoredStationsPayload;
}

interface IUpdateApproachingPayload {
  approaching: boolean;
}

interface IUpdateApproachingAction {
  type: typeof UPDATE_APPROACHING;
  payload: IUpdateApproachingPayload;
}

export type StationActionTypes =
  | IFetchStationStartAction
  | IFetchStationSuccessAction
  | IFetchStationFailedAction
  | IFetchStationListStartAction
  | IFetchStationListSuccessAction
  | IFetchStationListFailedAction
  | IRefreshNearestStationAction
  | IUpdateArrivedAction
  | IUpdateScoredStationsAction
  | IUpdateApproachingAction;
