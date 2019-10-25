import * as Location from 'expo-location';
import gql from 'graphql-tag';
import { Action } from 'redux';
import { ThunkAction } from 'redux-thunk';

import { AppState } from '../';
import client from '../../api/apollo';
import { IStationByCoordsData, IStationsByLineIdData } from '../../models/StationAPI';
import {
    fetchStationFailed, fetchStationListFailed, fetchStationListStart, fetchStationListSuccess,
    fetchStationStart, fetchStationSuccess,
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
