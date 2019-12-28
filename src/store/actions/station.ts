import {LineDirection} from '../../models/Bound';
import {IStation} from '../../models/StationAPI';
import {
  FETCH_STATION_FAILED,
  FETCH_STATION_LIST_FAILED,
  FETCH_STATION_LIST_START,
  FETCH_STATION_LIST_SUCCESS,
  FETCH_STATION_START,
  FETCH_STATION_SUCCESS,
  REFRESH_NEAREST_STATION,
  StationActionTypes,
  UPDATE_APPROACHING,
  UPDATE_ARRIVED,
  UPDATE_SCORED_STATIONS,
  UPDATE_SELECTED_BOUND,
  UPDATE_SELECTED_DIRECTION,
} from '../types/station';

export const fetchStationStart = (): StationActionTypes => ({
  type: FETCH_STATION_START,
});

export const fetchStationSuccess = (station: IStation): StationActionTypes => ({
  type: FETCH_STATION_SUCCESS,
  payload: {
    station,
  },
});

export const fetchStationFailed = (error: Error): StationActionTypes => ({
  type: FETCH_STATION_FAILED,
  payload: {
    error,
  },
});

export const fetchStationListStart = (): StationActionTypes => ({
  type: FETCH_STATION_LIST_START,
});

export const fetchStationListSuccess = (stations: IStation[]): StationActionTypes => ({
  type: FETCH_STATION_LIST_SUCCESS,
  payload: {
    stations,
  },
});

export const fetchStationListFailed = (error: Error): StationActionTypes => ({
  type: FETCH_STATION_LIST_FAILED,
  payload: {
    error,
  },
});

export const updateScoredStations = (stations: IStation[]): StationActionTypes => ({
  type: UPDATE_SCORED_STATIONS,
  payload: {
    stations,
  },
});

export const refreshNearestStation = (station: IStation): StationActionTypes => ({
  type: REFRESH_NEAREST_STATION,
  payload: {
    station,
  },
});

export const updateArrived = (arrived: boolean): StationActionTypes => ({
  type: UPDATE_ARRIVED,
  payload: {
    arrived,
  },
});

export const updateApproaching = (approaching: boolean): StationActionTypes => ({
  type: UPDATE_APPROACHING,
  payload: {
    approaching,
  },
});

export const updateSelectedDirection = (direction: LineDirection): StationActionTypes => ({
  type: UPDATE_SELECTED_DIRECTION,
  payload: {
    direction,
  },
});

export const updateSelectedBound = (station: IStation): StationActionTypes => ({
  type: UPDATE_SELECTED_BOUND,
  payload: {
    station,
  },
});
