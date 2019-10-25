import { IStation } from '../../models/StationAPI';

export const FETCH_STATION_START = 'FETCH_STATION_START';
export const FETCH_STATION_SUCCESS = 'FETCH_STATION_SUCCESS';
export const FETCH_STATION_FAILED = 'FETCH_STATION_FAILED';

export const FETCH_STATION_LIST_START = 'FETCH_STATION_LIST_START';
export const FETCH_STATION_LIST_SUCCESS = 'FETCH_STATION_LIST_SUCCESS';
export const FETCH_STATION_LIST_FAILED = 'FETCH_STATION_LIST_FAILED';

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

export type StationActionTypes =
  | IFetchStationStartAction
  | IFetchStationSuccessAction
  | IFetchStationFailedAction
  | IFetchStationListStartAction
  | IFetchStationListSuccessAction
  | IFetchStationListFailedAction;
