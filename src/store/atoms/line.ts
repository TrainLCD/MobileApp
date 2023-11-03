import { atom } from 'recoil'
import { Line } from '../../gen/stationapi_pb'
import { RECOIL_STATES } from '../../constants'

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
