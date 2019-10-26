import * as Location from 'expo-location';
import gql from 'graphql-tag';
import { Action } from 'redux';
import { ThunkAction } from 'redux-thunk';

import { AppState } from '../';
import client from '../../api/apollo';
import { ARRIVED_THRESHOLD } from '../../constants';
import { IStation, IStationByCoordsData, IStationsByLineIdData } from '../../models/StationAPI';
import { calcHubenyDistance } from '../../utils/hubeny';
import {
    fetchStationFailed, fetchStationListFailed, fetchStationListStart, fetchStationListSuccess,
    fetchStationStart, fetchStationSuccess, refreshNearestStation, updateArrived,
} from './station';

export const ERR_LOCATION_REJECTED = 'ERR_LOCATION_REJECTED';

export const fetchStationAsync = (
  location: Location.LocationData,
): ThunkAction<void, AppState, null, Action<string>> => async (dispatch) => {
  const { coords } = location;
  const { latitude, longitude } = coords;
  dispatch(fetchStationStart());
  try {
    const result = await client.query({
      query: gql`
        {
          stationByCoords(latitude: ${latitude}, longitude: ${longitude}) {
            groupId
            name
            nameK
            address
            distance
            latitude
            longitude
            lines {
              id
              companyId
              lineColorC
              name
            }
          }
        }
        `,
    });
    if (result.errors) {
      dispatch(fetchStationFailed(result.errors[0]));
      return;
    }
    const data = result.data as IStationByCoordsData;
    dispatch(fetchStationSuccess(data.stationByCoords));
  } catch (e) {
    dispatch(fetchStationFailed(e));
  }
};

export const fetchStationListAsync = (
  lineId: number,
): ThunkAction<void, AppState, null, Action<string>> => async (dispatch) => {
  dispatch(fetchStationListStart());
  try {
    const result = await client.query({
      query: gql`
        {
          stationsByLineId(lineId: ${lineId}) {
            groupId
            name
            nameK
            address
            latitude
            longitude
            lines {
              id
              companyId
              lineColorC
              name
            }
          }
        }
        `,
    });
    if (result.errors) {
      dispatch(fetchStationFailed(result.errors[0]));
      return;
    }
    const data = result.data as IStationsByLineIdData;
    dispatch(fetchStationListSuccess(data.stationsByLineId));
  } catch (e) {
    dispatch(fetchStationListFailed(e));
  }
};

const isArrived = (nearestStation: IStation) => {
  if (!nearestStation) {
    return false;
  }
  return nearestStation.distance < ARRIVED_THRESHOLD;
};

const calcStationDistances = (stations: IStation[], latitude: number, longitude: number): IStation[] => {
  const scored = stations.map((station) => {
    const distance = calcHubenyDistance(
      { latitude, longitude },
      { latitude: station.latitude, longitude: station.longitude },
    );
    return { ...station, distance };
  });
  scored.sort((a, b) => {
    if (a.distance < b.distance) {
      return -1;
    }
    if (a.distance > b.distance) {
      return 1;
    }
    return 0;
  });
  return scored;
};

export const refreshNearestStationAsync = (
  location: Location.LocationData,
): ThunkAction<void, AppState, null, Action<string>> => async (dispatch, getState) => {
  const { stations } = getState().station;
  const { latitude, longitude } = location.coords;
  const scoredStations = calcStationDistances(stations, latitude, longitude);
  const arrived = isArrived(scoredStations[0]);
  dispatch(updateArrived(arrived));
  dispatch(refreshNearestStation(scoredStations[0]));
};
