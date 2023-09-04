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
  fetchStationError: Error | null
  fetchStationListError: Error | null
  selectedDirection: LineDirection | null
  selectedBound: Station.AsObject | null
}

export const initialStationState: StationState = {
  arrived: true,
  approaching: false,
  station: null,
  stations: [],
  sortedStations: [],
  fetchStationError: null,
  fetchStationListError: null,
  selectedDirection: null,
  selectedBound: null,
}

const stationState = atom<StationState>({
  key: RECOIL_STATES.station,
  default: initialStationState,
})

export default stationState
