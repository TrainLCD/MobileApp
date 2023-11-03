import { atom } from 'recoil'
import { Station } from '../../gen/stationapi_pb'
import { LineDirection } from '../../models/Bound'
import { RECOIL_STATES } from '../../constants'

export interface StationState {
  arrived: boolean
  approaching: boolean
  station: Station.AsObject | null
  stations: Station.AsObject[]
  allStations: Station.AsObject[] // 行先指定用。フィルターされても全駅を行先に指定できるようにするため
  sortedStations: Station.AsObject[]
  selectedDirection: LineDirection | null
  selectedBound: Station.AsObject | null
  wantedDestination: Station.AsObject | null
  // この下は代入されるとアプリ全体が再レンダリングされるので注意
  fetchStationError: Error | null
}

export const initialStationState: StationState = {
  arrived: true,
  approaching: false,
  station: null,
  stations: [],
  allStations: [],
  sortedStations: [],
  selectedDirection: null,
  selectedBound: null,
  wantedDestination: null,
  fetchStationError: null,
}

const stationState = atom<StationState>({
  key: RECOIL_STATES.station,
  default: initialStationState,
})

export default stationState
