import { atom } from 'recoil'
import RECOIL_STATES from '../../constants/state'

export interface PiPState {
  isInPiPMode: boolean
}

const pipState = atom<PiPState>({
  key: RECOIL_STATES.pipState,
  default: {
    isInPiPMode: false,
  },
})

export default pipState
