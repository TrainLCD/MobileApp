import { atom } from 'recoil';
import {
  AvailableLanguage,
  ALL_AVAILABLE_LANGUAGES,
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
  trainType: APITrainType | APITrainTypeMinimum | null;
  headerState: HeaderTransitionState;
  bottomState: BottomTransitionState;
  requiredPermissionGranted: boolean;
  stationForHeader: Station | null;
  enabledLanguages: AvailableLanguage[];
  autoMode: boolean;
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
    autoMode: false,
  },
});

export default navigationState;
