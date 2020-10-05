import { BottomTransitionState } from '../../models/BottomTransitionState';
import { HeaderTransitionState } from '../../models/HeaderTransitionState';
import { Station } from '../../models/StationAPI';
import { isJapanese } from '../../translation';
import { NavigationActionTypes } from '../types/navigation';

export interface NavigationState {
  leftStations: Station[];
  headerState: HeaderTransitionState;
  bottomState: BottomTransitionState;
  requiredPermissionGranted: boolean;
}

const initialState: NavigationState = {
  headerState: isJapanese ? 'CURRENT' : 'CURRENT_EN',
  bottomState: 'LINE',
  leftStations: [],
  requiredPermissionGranted: false,
};

const navigationReducer = (
  state = initialState,
  action: NavigationActionTypes
): NavigationState => {
  switch (action.type) {
    case 'REFRESH_LEFT_STATIONS':
      return {
        ...state,
        leftStations: action.payload.stations,
      };
    case 'REFRESH_HEADER_STATE':
      return {
        ...state,
        headerState: action.payload.state,
      };
    case 'REFRESH_BOTTOM_STATE':
      return {
        ...state,
        bottomState: action.payload.state,
      };
    case 'UPDATE_GRANTED_REQUIRED_PERMISSION':
      return {
        ...state,
        requiredPermissionGranted: action.payload,
      };
    default:
      return state;
  }
};

export default navigationReducer;
