import { BottomTransitionState } from '../../models/BottomTransitionState';
import { HeaderTransitionState } from '../../models/HeaderTransitionState';
import { Station } from '../../models/StationAPI';
import {
  NavigationActionTypes,
  REFRESH_BOTTOM_STATE,
  REFRESH_HEADER_STATE,
  REFRESH_LEFT_STATIONS,
  UPDATE_GRANTED_REQUIRED_PERMISSION,
} from '../types/navigation';

export const refreshLeftStations = (
  stations: Station[]
): NavigationActionTypes => ({
  type: REFRESH_LEFT_STATIONS,
  payload: {
    stations,
  },
});

export const updateHeaderState = (
  state: HeaderTransitionState
): NavigationActionTypes => ({
  type: REFRESH_HEADER_STATE,
  payload: {
    state,
  },
});

export const updateBottomState = (
  state: BottomTransitionState
): NavigationActionTypes => ({
  type: REFRESH_BOTTOM_STATE,
  payload: {
    state,
  },
});

export const updateGrantedRequiredPermission = (
  flag: boolean
): NavigationActionTypes => ({
  type: UPDATE_GRANTED_REQUIRED_PERMISSION,
  payload: flag,
});
