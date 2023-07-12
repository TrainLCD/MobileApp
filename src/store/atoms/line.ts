import { atom } from 'recoil'
import RECOIL_STATES from '../../constants/state'
import { Line } from '../../gen/stationapi_pb'

export interface LineState {
  selectedLine: Line.AsObject | null
}

const lineState = atom<LineState>({
  key: RECOIL_STATES.line,
  default: {
    selectedLine: null,
  },
})

export default lineState
