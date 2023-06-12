import { atom } from 'recoil'
import RECOIL_STATES from '../../constants/state'
import { StationAPIClient } from '../../gen/StationapiServiceClientPb'

export interface GRPCState {
  cachedClient: StationAPIClient | null
}

const grpcState = atom<GRPCState>({
  key: RECOIL_STATES.grpc,
  default: {
    cachedClient: null,
  },
})

export default grpcState
