import { atom } from 'recoil'
import {
  ALL_AVAILABLE_LANGUAGES,
  AvailableLanguage,
} from '../../constants/languages'
import RECOIL_STATES from '../../constants/state'
import { Station, TrainType } from '../../gen/stationapi_pb'
import { BottomTransitionState } from '../../models/BottomTransitionState'
import { HeaderTransitionState } from '../../models/HeaderTransitionState'
import { isJapanese } from '../../translation'

export interface NavigationState {
  leftStations: Station.AsObject[]
  trainType: TrainType.AsObject | null
  headerState: HeaderTransitionState
  bottomState: BottomTransitionState
  requiredPermissionGranted: boolean
  // stationForHeader: 急行等で使用しているとき地理的な最寄り駅と次の停車駅が違う時があるので、
  // 実際の次の停車駅を保持している
  stationForHeader: Station.AsObject | null
  enabledLanguages: AvailableLanguage[]
  autoModeEnabled: boolean
  fetchedTrainTypes: TrainType.AsObject[]
}

export const initialNavigationState = {
  headerState: (isJapanese ? 'CURRENT' : 'CURRENT_EN') as HeaderTransitionState,
  trainType: null,
  bottomState: 'LINE' as BottomTransitionState,
  leftStations: [],
  requiredPermissionGranted: false,
  stationForHeader: null,
  enabledLanguages: ALL_AVAILABLE_LANGUAGES,
  autoModeEnabled: false,
  fetchedTrainTypes: [],
}

const navigationState = atom<NavigationState>({
  key: RECOIL_STATES.navigation,
  default: initialNavigationState,
})

export default navigationState
