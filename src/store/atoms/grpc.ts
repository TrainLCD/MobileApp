import { atom } from 'recoil'
import { StationAPIClient } from '../../gen/StationapiServiceClientPb'
import { RECOIL_STATES } from '../../constants'

export interface GRpcState {
  cachedClient: StationAPIClient | null
}

const devState = atom<GRpcState>({
  key: RECOIL_STATES.grpc,
  default: { cachedClient: null },
})

export default devState
