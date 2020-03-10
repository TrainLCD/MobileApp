import * as Localization from 'expo-localization';
import i18n from 'i18n-js';
import {BottomTransitionState} from '../../models/BottomTransitionState';
import {HeaderTransitionState} from '../../models/HeaderTransitionState';
import {IStation} from '../../models/StationAPI';
import {NavigationActionTypes} from '../types/navigation';

i18n.locale = Localization.locale.split('-')[0];

export interface INavigationState {
  leftStations: IStation[];
  headerState: HeaderTransitionState;
  bottomState: BottomTransitionState;
  refreshHeaderStateIntervalIds: NodeJS.Timeout[];
}

const initialState: INavigationState = {
  headerState: i18n.locale === 'ja' ? 'CURRENT' : 'CURRENT_EN',
  bottomState: 'LINE',
  leftStations: [],
  refreshHeaderStateIntervalIds: [],
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
    case 'REFRESH_BOTTOM_STATE':
      return {
        ...state,
        bottomState: action.payload.state,
      };
    case 'UPDATE_REFRESH_HEADER_STATE_INTERVAL_IDS':
      return {
        ...state,
        refreshHeaderStateIntervalIds: action.payload.ids,
      };
    default:
      return state;
  }
};

export default navigationReducer;
