import { atom } from 'recoil'
import RECOIL_STATES from '../../constants/state'
import { StationResponse } from '../../gen/stationapi_pb'
import { LineDirection } from '../../models/Bound'
import { Station } from '../../models/StationAPI'

/**
 * @deprecated use StationStateGRPC instead
 */
export interface StationState {
  arrived: boolean
  approaching: boolean
  station: Station | null
  stations: Station[]
  sortedStations: Station[]
  fetchStationError: Error | null
  fetchStationListError: Error | null
  selectedDirection: LineDirection | null
  selectedBound: Station | null
  stationsWithTrainTypes: Station[]
}

// TODO: 移行が終わったっら消してStationStateにリネームする
export interface StationStateGRPC {
  arrived: boolean
  approaching: boolean
  station: StationResponse.AsObject | null
  stations: StationResponse.AsObject[]
  sortedStations: StationResponse.AsObject[]
  fetchStationError: Error | null
  fetchStationListError: Error | null
  selectedDirection: LineDirection | null
  selectedBound: StationResponse.AsObject | null
  stationsWithTrainTypes: StationResponse.AsObject[]
}

export const initialStationState = {
  arrived: true,
  approaching: false,
  station: null,
  stations: [],
  sortedStations: [],
  fetchStationError: null,
  fetchStationListError: null,
  selectedDirection: null,
  selectedBound: null,
  stationsWithTrainTypes: [],
}

const stationState = atom<StationStateGRPC>({
  key: RECOIL_STATES.station,
  default: initialStationState,
})

export default stationState
