import * as Location from 'expo-location';
import gql from 'graphql-tag';
import { Action } from 'redux';
import { ThunkAction } from 'redux-thunk';

import { TrainLCDAppState } from '..';
import client from '../../api/apollo';
import { getApproachingThreshold, getArrivedThreshold } from '../../constants';
import {
  Line,
  Station,
  StationByCoordsData,
  StationsByLineIdData,
} from '../../models/StationAPI';
import calcHubenyDistance from '../../utils/hubeny';
import {
  fetchStationFailed,
  fetchStationListFailed,
  fetchStationListStart,
  fetchStationListSuccess,
  fetchStationStart,
  fetchStationSuccess,
  refreshNearestStation,
  updateApproaching,
  updateArrived,
  updateScoredStations,
} from './station';

export const ERR_LOCATION_REJECTED = 'ERR_LOCATION_REJECTED';

export const fetchStationAsync = (
  location: Location.LocationData
): ThunkAction<void, TrainLCDAppState, null, Action<string>> => async (
  dispatch
): Promise<void> => {
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
            nameR
            address
            distance
            latitude
            longitude
            lines {
              id
              companyId
              lineColorC
              name
              nameR
              lineType
            }
          }
        }
      `,
    });
    if (result.errors) {
      dispatch(fetchStationFailed(result.errors[0]));
      return;
    }
    const data = result.data as StationByCoordsData;
    dispatch(fetchStationSuccess(data.stationByCoords));
  } catch (e) {
    dispatch(fetchStationFailed(e));
  }
};

export const fetchStationListAsync = (
  lineId: number
): ThunkAction<void, TrainLCDAppState, null, Action<string>> => async (
  dispatch
): Promise<void> => {
  dispatch(fetchStationListStart());
  try {
    const result = await client.query({
      query: gql`
        {
          stationsByLineId(lineId: ${lineId}) {
            groupId
            name
            nameK
            nameR
            address
            latitude
            longitude
            lines {
              id
              companyId
              lineColorC
              name
              nameR
              lineType
            }
          }
        }
      `,
    });
    if (result.errors) {
      dispatch(fetchStationFailed(result.errors[0]));
      return;
    }
    const data = result.data as StationsByLineIdData;
    dispatch(fetchStationListSuccess(data.stationsByLineId));
  } catch (e) {
    dispatch(fetchStationListFailed(e));
  }
};

const isArrived = (nearestStation: Station, currentLine: Line): boolean => {
  if (!nearestStation) {
    return false;
  }
  const ARRIVED_THRESHOLD = getArrivedThreshold(currentLine.lineType);
  return nearestStation.distance < ARRIVED_THRESHOLD;
};

const isApproaching = (
  nextStation: Station,
  nearestStation: Station,
  currentLine: Line
): boolean => {
  if (!nextStation) {
    return false;
  }
  const APPROACHING_THRESHOLD = getApproachingThreshold(currentLine.lineType);
  // APPROACHING_THRESHOLD以上次の駅から離れている: つぎは
  // APPROACHING_THRESHOLDより近い: まもなく
  return (
    nearestStation.distance < APPROACHING_THRESHOLD &&
    nearestStation.groupId === nextStation.groupId
  );
};

const getRefreshConditions = (
  displayedNext: Station,
  scoredNext: Station,
  currentLine: Line
): boolean =>
  scoredNext.distance < getArrivedThreshold(currentLine.lineType) ||
  displayedNext.groupId !== scoredNext.groupId; // この時点で表示と実際の最寄り駅で乖離が起きている

const calcStationDistances = (
  stations: Station[],
  latitude: number,
  longitude: number
): Station[] => {
  const scored = stations.map((station) => {
    const distance = calcHubenyDistance(
      { latitude, longitude },
      { latitude: station.latitude, longitude: station.longitude }
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

export const updateScoredStationsAsync = (
  location: Location.LocationData
): ThunkAction<void, TrainLCDAppState, null, Action<string>> => async (
  dispatch,
  getState
): Promise<void> => {
  const { stations } = getState().station;
  const { latitude, longitude } = location.coords;
  const scoredStations = calcStationDistances(stations, latitude, longitude);
  dispatch(updateScoredStations(scoredStations));
};

export const refreshNearestStationAsync = (
  location: Location.LocationData
): ThunkAction<void, TrainLCDAppState, null, Action<string>> => async (
  dispatch,
  getState
): Promise<void> => {
  const { stations } = getState().station;
  const { selectedLine } = getState().line;
  const { leftStations } = getState().navigation;
  const { latitude, longitude } = location.coords;
  const scoredStations = calcStationDistances(stations, latitude, longitude);
  const nearestStation = scoredStations[0];
  const arrived = isArrived(nearestStation, selectedLine);
  const approaching = isApproaching(
    leftStations[1],
    nearestStation,
    selectedLine
  );
  const conditionPassed = getRefreshConditions(
    leftStations[1],
    nearestStation,
    selectedLine
  );
  dispatch(updateScoredStations(scoredStations));
  dispatch(updateArrived(arrived));
  dispatch(updateApproaching(approaching));
  if (conditionPassed) {
    dispatch(refreshNearestStation(nearestStation));
  }
};
