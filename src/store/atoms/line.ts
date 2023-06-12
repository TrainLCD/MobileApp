import { atom } from 'recoil'
import RECOIL_STATES from '../../constants/state'
import { LineResponse } from '../../gen/stationapi_pb'

export interface LineState {
  selectedLine: LineResponse.AsObject | null
  // オフライン用
  prevSelectedLine: LineResponse.AsObject | null
}

const lineState = atom<LineState>({
  key: RECOIL_STATES.line,
  default: {
    selectedLine: null,
    prevSelectedLine: null,
  },
})

export default lineState
