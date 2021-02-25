import { atom } from 'recoil';
import RECOIL_STATES from '../../constants/state';
import { BottomTransitionState } from '../../models/BottomTransitionState';
import { HeaderTransitionState } from '../../models/HeaderTransitionState';
import { APITrainType, Station } from '../../models/StationAPI';
import { isJapanese } from '../../translation';

export interface NavigationState {
  leftStations: Station[];
  trainType: APITrainType | null;
  headerState: HeaderTransitionState;
  bottomState: BottomTransitionState;
  requiredPermissionGranted: boolean;
  headerShown: boolean;
  stationForHeader: Station | null;
}

const navigationState = atom<NavigationState>({
  key: RECOIL_STATES.navigation,
  default: {
    headerState: isJapanese ? 'CURRENT' : 'CURRENT_EN',
    trainType: null,
    bottomState: 'LINE',
    leftStations: [],
    requiredPermissionGranted: false,
    headerShown: true,
    stationForHeader: null,
  },
});

export default navigationState;
