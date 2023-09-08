import { atom } from 'recoil'
import RECOIL_STATES from '../../constants/state'
import { Station } from '../../gen/stationapi_pb'
import { LineDirection } from '../../models/Bound'

export interface StationState {
  arrived: boolean
  approaching: boolean
  station: Station.AsObject | null
  stations: Station.AsObject[]
  sortedStations: Station.AsObject[]
  selectedDirection: LineDirection | null
  selectedBound: Station.AsObject | null
  // この下2行は代入されるとアプリ全体が再レンダリングされるので注意
  fetchStationError: Error | null
}

export const initialStationState: StationState = {
  arrived: true,
  approaching: false,
  station: null,
  stations: [],
  sortedStations: [],
  selectedDirection: null,
  selectedBound: null,
  fetchStationError: null,
}

const stationState = atom<StationState>({
  key: RECOIL_STATES.station,
  default: initialStationState,
})

export default stationState
