import { LineDirection } from '../../models/Bound';
import { Station } from '../../models/StationAPI';
import {
  FETCH_STATION_LIST_SUCCESS,
  FETCH_STATION_SUCCESS,
  REFRESH_NEAREST_STATION,
  StationActionTypes,
  UPDATE_APPROACHING,
  UPDATE_ARRIVED,
  UPDATE_SCORED_STATIONS,
  UPDATE_SELECTED_BOUND,
  UPDATE_SELECTED_DIRECTION,
} from '../types/station';

export const fetchStationSuccess = (station: Station): StationActionTypes => ({
  type: FETCH_STATION_SUCCESS,
  payload: {
    station,
  },
});

export const fetchStationListSuccess = (
  stations: Station[]
): StationActionTypes => ({
  type: FETCH_STATION_LIST_SUCCESS,
  payload: {
    stations,
  },
});

export const updateScoredStations = (
  stations: Station[]
): StationActionTypes => ({
  type: UPDATE_SCORED_STATIONS,
  payload: {
    stations,
  },
});

export const refreshNearestStation = (
  station: Station
): StationActionTypes => ({
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

export const updateApproaching = (
  approaching: boolean
): StationActionTypes => ({
  type: UPDATE_APPROACHING,
  payload: {
    approaching,
  },
});

export const updateSelectedDirection = (
  direction: LineDirection
): StationActionTypes => ({
  type: UPDATE_SELECTED_DIRECTION,
  payload: {
    direction,
  },
});

export const updateSelectedBound = (station: Station): StationActionTypes => ({
  type: UPDATE_SELECTED_BOUND,
  payload: {
    station,
  },
});
