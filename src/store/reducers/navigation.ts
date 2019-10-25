import { BottomTransitionState } from '../../models/BottomTransitionState';
import { HeaderTransitionState } from '../../models/HeaderTransitionState';
import { IStation } from '../../models/StationAPI';
import { NavigationActionTypes } from '../types/navigation';

export interface INavigationState {
  leftStations: IStation[];
  headerState: HeaderTransitionState;
  bottomState: BottomTransitionState;
  arrived: boolean;
}

const initialState: INavigationState = {
  headerState: 'CURRENT',
  arrived: false,
  bottomState: 'LINE',
  leftStations: [],
};

const navigationReducer = (
  state = initialState,
  action: NavigationActionTypes,
): INavigationState => {
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
    default:
      return state;
  }
};

export default navigationReducer;
