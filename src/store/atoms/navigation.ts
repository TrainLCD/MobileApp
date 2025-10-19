import { atom } from 'jotai';
import type { Station, TrainType } from '~/@types/graphql';
import type { SavedRoute } from '~/models/SavedRoute';
import {
  ALL_AVAILABLE_LANGUAGES,
  type AvailableLanguage,
} from '../../constants';
import type { BottomTransitionState } from '../../models/BottomTransitionState';
import type { HeaderTransitionState } from '../../models/HeaderTransitionState';
import { isJapanese } from '../../translation';

export interface NavigationState {
  leftStations: Station[];
  trainType: TrainType | null;
  headerState: HeaderTransitionState;
  bottomState: BottomTransitionState;
  // stationForHeader: 急行等で使用しているとき地理的な最寄り駅と次の停車駅が違う時があるので、
  // 実際の次の停車駅を保持している
  stationForHeader: Station | null;
  enabledLanguages: AvailableLanguage[];
  fetchedTrainTypes: TrainType[];
  autoModeEnabled: boolean;
  enableLegacyAutoMode: boolean;
  isAppLatest: boolean;
  firstStop: boolean;
  presetsFetched: boolean;
  presetRoutes: SavedRoute[];
}

export const initialNavigationState: NavigationState = {
  headerState: (isJapanese ? 'CURRENT' : 'CURRENT_EN') as HeaderTransitionState,
  trainType: null,
  bottomState: 'LINE' as BottomTransitionState,
  leftStations: [],
  stationForHeader: null,
  enabledLanguages: ALL_AVAILABLE_LANGUAGES,
  fetchedTrainTypes: [],
  autoModeEnabled: false,
  enableLegacyAutoMode: false,
  isAppLatest: false,
  firstStop: true,
  presetsFetched: false,
  presetRoutes: [],
};

const navigationState = atom<NavigationState>(initialNavigationState);

export default navigationState;
