import {BottomTransitionState} from '../../models/BottomTransitionState';
import {HeaderTransitionState} from '../../models/HeaderTransitionState';
import {IStation} from '../../models/StationAPI';
import {
  NavigationActionTypes,
  REFRESH_BOTTOM_STATE,
  REFRESH_HEADER_STATE,
  REFRESH_LEFT_STATIONS,
  UPDATE_REFRESH_HEADER_STATE_INTERVAL_IDS,
} from '../types/navigation';

export const refreshLeftStations = (
  stations: IStation[],
): NavigationActionTypes => ({
  type: REFRESH_LEFT_STATIONS,
  payload: {
    stations,
  },
});

export const updateHeaderState = (
  state: HeaderTransitionState,
): NavigationActionTypes => ({
  type: REFRESH_HEADER_STATE,
  payload: {
    state,
  },
});

export const updateBottomState = (
  state: BottomTransitionState,
): NavigationActionTypes => ({
  type: REFRESH_BOTTOM_STATE,
  payload: {
    state,
  },
});

export const updateRefreshHeaderStateIntervalIds = (
  ids: NodeJS.Timeout[],
): NavigationActionTypes => ({
  type: UPDATE_REFRESH_HEADER_STATE_INTERVAL_IDS,
  payload: {
    ids,
  },
});
