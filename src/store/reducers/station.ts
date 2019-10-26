import { IStation } from '../../models/StationAPI';
import { StationActionTypes } from '../types/station';

export interface IStationState {
  arrived: boolean;
  station: IStation;
  stations: IStation[];
  fetchStationError: Error;
  fetchStationListError: Error;
}

const initialState: IStationState = {
  arrived: false,
  station: null,
  stations: [],
  fetchStationError: null,
  fetchStationListError: null,
};

const stationReducer = (
  state = initialState,
  action: StationActionTypes,
): IStationState => {
  switch (action.type) {
    case 'FETCH_STATION_START':
      return {
        ...state,
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
    default:
      return state;
  }
};

export default stationReducer;
