import { atom } from 'recoil'
import { RECOIL_STATES } from '../../constants'

export interface StationState {
  enabled: boolean
  muted: boolean
  losslessEnabled: boolean
  backgroundEnabled: boolean
  monetizedPlanEnabled: boolean
}

const speechState = atom<StationState>({
  key: RECOIL_STATES.speech,
  default: {
    enabled: false,
    muted: true,
    losslessEnabled: false,
    backgroundEnabled: true, // TODO: コミット前にfalseにする
    monetizedPlanEnabled: false,
  },
})

export default speechState
