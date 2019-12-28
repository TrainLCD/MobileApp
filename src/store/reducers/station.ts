import {LineDirection} from '../../models/Bound';
import {IStation} from '../../models/StationAPI';
import {StationActionTypes} from '../types/station';

export interface IStationState {
  arrived: boolean;
  approaching: boolean;
  station: IStation;
  stations: IStation[];
  scoredStations: IStation[];
  fetchStationError: Error;
  fetchStationListError: Error;
  selectedDirection: LineDirection;
  selectedBound: IStation;
}

const initialState: IStationState = {
  arrived: false,
  approaching: false,
  station: null,
  stations: [],
  scoredStations: [],
  fetchStationError: null,
  fetchStationListError: null,
  selectedDirection: null,
  selectedBound: null,
};

const stationReducer = (
  state = initialState,
  action: StationActionTypes,
): IStationState => {
  switch (action.type) {
    case 'FETCH_STATION_START':
      return {
        ...state,
        station: null,
        fetchStationError: null,
      };
    case 'FETCH_STATION_SUCCESS':
      return {
        ...state,
        station: action.payload.station,
      };
    case 'FETCH_STATION_FAILED':
      return {
        ...state,
        fetchStationError: action.payload.error,
      };
    case 'FETCH_STATION_LIST_START':
      return {
        ...state,
        stations: [],
        fetchStationListError: null,
      };
    case 'FETCH_STATION_LIST_SUCCESS':
      return {
        ...state,
        stations: action.payload.stations,
      };
    case 'FETCH_STATION_LIST_FAILED':
      return {
        ...state,
        fetchStationListError: action.payload.error,
      };
    case 'REFRESH_NEAREST_STATION':
      return {
        ...state,
        station: action.payload.station,
      };
    case 'UPDATE_ARRIVED':
      return {
        ...state,
        arrived: action.payload.arrived,
      };
    case 'UPDATE_SCORED_STATIONS':
      return {
        ...state,
        scoredStations: action.payload.stations,
      };
    case 'UPDATE_APPROACHING':
      return {
        ...state,
        approaching: action.payload.approaching,
      };
    case 'UPDATE_SELECTED_DIRECTION':
      return {
        ...state,
        selectedDirection: action.payload.direction,
      };
    case 'UPDATE_SELECTED_BOUND':
      return {
        ...state,
        selectedBound: action.payload.station,
      };
    default:
      return state;
  }
};

export default stationReducer;
