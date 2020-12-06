import { atom } from 'recoil';
import RECOIL_STATES from '../../constants/state';
import { BottomTransitionState } from '../../models/BottomTransitionState';
import { HeaderTransitionState } from '../../models/HeaderTransitionState';
import { Station } from '../../models/StationAPI';
import { isJapanese } from '../../translation';

export interface NavigationState {
  leftStations: Station[];
  headerState: HeaderTransitionState;
  bottomState: BottomTransitionState;
  requiredPermissionGranted: boolean;
}

const navigationState = atom<NavigationState>({
  key: RECOIL_STATES.navigation,
  default: {
    headerState: isJapanese ? 'CURRENT' : 'CURRENT_EN',
    bottomState: 'LINE',
    leftStations: [],
    requiredPermissionGranted: false,
  },
});

export default navigationState;
