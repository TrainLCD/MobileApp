import { atom } from 'recoil'
import { RECOIL_STATES } from '../../constants'
import { isDevApp } from '../../utils/isDevApp'

export interface StationState {
  enabled: boolean
  losslessEnabled: boolean
  backgroundEnabled: boolean
  monetizedPlanEnabled: boolean
}

const speechState = atom<StationState>({
  key: RECOIL_STATES.speech,
  default: {
    enabled: false,
    losslessEnabled: false, // NOTE: プレミアム音声施策であり未実装
    backgroundEnabled: false, // NOTE: これもプレミアム音声施策であり未実装
    monetizedPlanEnabled: isDevApp,
  },
})

export default speechState
