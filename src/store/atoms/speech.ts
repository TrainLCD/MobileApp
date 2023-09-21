import { atom } from 'recoil'
import RECOIL_STATES from '../../constants/state'

export interface StationState {
  enabled: boolean
  muted: boolean
  losslessEnabled: boolean
}

const speechState = atom<StationState>({
  key: RECOIL_STATES.speech,
  default: {
    enabled: false,
    muted: true,
    losslessEnabled: false,
  },
})

export default speechState
