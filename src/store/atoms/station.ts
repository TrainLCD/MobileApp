import { atom } from 'recoil'
import { Station } from '../../../gen/proto/stationapi_pb'
import { RECOIL_STATES } from '../../constants'
import { LineDirection } from '../../models/Bound'

export interface StationState {
  arrived: boolean
  approaching: boolean
  station: Station | null
  stations: Station[]
  allStations: Station[] // 行先指定用。フィルターされても全駅を行先に指定できるようにするため
  selectedDirection: LineDirection | null
  selectedBound: Station | null
  wantedDestination: Station | null
  // この下は代入されるとアプリ全体が再レンダリングされるので注意
  fetchStationError: Error | null
}

export const initialStationState: StationState = {
  arrived: true,
  approaching: false,
  station: null,
  stations: [],
  allStations: [],
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
