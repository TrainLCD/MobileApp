import { atom } from 'recoil'
import RECOIL_STATES from '../../constants/state'
import { StationAPIClient } from '../../gen/StationapiServiceClientPb'

export interface GRpcState {
  cachedClient: StationAPIClient | null
}

const devState = atom<GRpcState>({
  key: RECOIL_STATES.grpc,
  default: { cachedClient: null },
})

export default devState
