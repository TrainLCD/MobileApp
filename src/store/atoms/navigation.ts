import { atom } from 'recoil'
import { Station, TrainType } from '../../../gen/proto/stationapi_pb'
import {
  ALL_AVAILABLE_LANGUAGES,
  AvailableLanguage,
  RECOIL_STATES,
} from '../../constants'
import { BottomTransitionState } from '../../models/BottomTransitionState'
import { HeaderTransitionState } from '../../models/HeaderTransitionState'
import { isJapanese } from '../../translation'

export interface NavigationState {
  leftStations: Station[]
  trainType: TrainType | null
  headerState: HeaderTransitionState
  bottomState: BottomTransitionState
  // stationForHeader: 急行等で使用しているとき地理的な最寄り駅と次の停車駅が違う時があるので、
  // 実際の次の停車駅を保持している
  stationForHeader: Station | null
  enabledLanguages: AvailableLanguage[]
  autoModeEnabled: boolean
  fetchedTrainTypes: TrainType[]
  fromBuilder: boolean
}

export const initialNavigationState: NavigationState = {
  headerState: (isJapanese ? 'CURRENT' : 'CURRENT_EN') as HeaderTransitionState,
  trainType: null,
  bottomState: 'LINE' as BottomTransitionState,
  leftStations: [],
  stationForHeader: null,
  enabledLanguages: ALL_AVAILABLE_LANGUAGES,
  autoModeEnabled: false,
  fetchedTrainTypes: [],
  fromBuilder: false,
}

const navigationState = atom<NavigationState>({
  key: RECOIL_STATES.navigation,
  default: initialNavigationState,
})

export default navigationState
