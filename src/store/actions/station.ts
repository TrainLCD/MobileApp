import { IStation } from '../../models/StationAPI';
import {
    FETCH_STATION_FAILED, FETCH_STATION_LIST_FAILED, FETCH_STATION_LIST_START,
    FETCH_STATION_LIST_SUCCESS, FETCH_STATION_START, FETCH_STATION_SUCCESS, REFRESH_NEAREST_STATION,
    StationActionTypes,
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

export const refreshNearestStation = (station: IStation): StationActionTypes => ({
  type: REFRESH_NEAREST_STATION,
  payload: {
    station,
  },
});
