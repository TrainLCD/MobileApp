import { BottomTransitionState } from '../../models/BottomTransitionState';
import { HeaderTransitionState } from '../../models/HeaderTransitionState';
import {
    IRefreshLeftStationsPayload, NavigationActionTypes, REFRESH_BOTTOM_STATE, REFRESH_HEADER_STATE,
    REFRESH_HEADER_STATE_INTERVAL_ID,
    REFRESH_LEFT_STATIONS,
} from '../types/navigation';

export const refreshLeftStations = (payload: IRefreshLeftStationsPayload): NavigationActionTypes => ({
  type: REFRESH_LEFT_STATIONS,
  payload,
});

export const refreshHeaderState = (state: HeaderTransitionState): NavigationActionTypes => ({
  type: REFRESH_HEADER_STATE,
  payload: {
    state,
  },
});

export const refreshBottomState = (state: BottomTransitionState): NavigationActionTypes => ({
  type: REFRESH_BOTTOM_STATE,
  payload: {
    state,
  },
});

export const setRefreshHeaderStateIntervalId = (id: number): NavigationActionTypes => ({
  type: REFRESH_HEADER_STATE_INTERVAL_ID,
  payload: {
    id,
  },
});
