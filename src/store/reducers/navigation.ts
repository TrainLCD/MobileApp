import * as Localization from 'expo-localization';
import i18n from 'i18n-js';
import { BottomTransitionState } from '../../models/BottomTransitionState';
import { HeaderTransitionState } from '../../models/HeaderTransitionState';
import { Station } from '../../models/StationAPI';
import { NavigationActionTypes } from '../types/navigation';

const [locale] = Localization.locale.split('-');
i18n.locale = locale;

export interface NavigationState {
  leftStations: Station[];
  headerState: HeaderTransitionState;
  bottomState: BottomTransitionState;
}

const initialState: NavigationState = {
  headerState: i18n.locale === 'ja' ? 'CURRENT' : 'CURRENT_EN',
  bottomState: 'LINE',
  leftStations: [],
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
    default:
      return state;
  }
};

export default navigationReducer;
