import { atom } from 'recoil';
import {
  ALL_AVAILABLE_LANGUAGES,
  AvailableLanguage,
} from '../../constants/languages';
import RECOIL_STATES from '../../constants/state';
import { BottomTransitionState } from '../../models/BottomTransitionState';
import { HeaderTransitionState } from '../../models/HeaderTransitionState';
import {
  APITrainType,
  APITrainTypeMinimum,
  Station,
} from '../../models/StationAPI';
import { isJapanese } from '../../translation';

export interface NavigationState {
  leftStations: Station[];
  trainType: APITrainType | APITrainTypeMinimum | null | undefined;
  headerState: HeaderTransitionState;
  bottomState: BottomTransitionState;
  requiredPermissionGranted: boolean;
  stationForHeader: Station | null;
  enabledLanguages: AvailableLanguage[];
  autoModeEnabled: boolean;
}

const navigationState = atom<NavigationState>({
  key: RECOIL_STATES.navigation,
  default: {
    headerState: isJapanese ? 'CURRENT' : 'CURRENT_EN',
    trainType: null,
    bottomState: 'LINE',
    leftStations: [],
    requiredPermissionGranted: false,
    stationForHeader: null,
    enabledLanguages: ALL_AVAILABLE_LANGUAGES,
    autoModeEnabled: false,
  },
});

export default navigationState;
