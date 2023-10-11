import { atom } from 'recoil'
import RECOIL_STATES from '../../constants/state'

export type CacheBody = {
  text: string
  path: string
}

export type CacheState = {
  cache: Map<string, CacheBody>
}

const cacheState = atom<CacheState>({
  key: RECOIL_STATES.cacheState,
  default: {
    cache: new Map<string, CacheBody>(),
  },
})

export default cacheState
