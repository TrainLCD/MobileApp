import { atom } from 'recoil'
import { RECOIL_STATES } from '../../constants'

export type TTSCacheBody = {
  text: string
  path: string
}

export type CacheState = {
  ttsCache: Map<string, TTSCacheBody>
}

const cacheState = atom<CacheState>({
  key: RECOIL_STATES.cacheState,
  default: {
    ttsCache: new Map<string, TTSCacheBody>(),
  },
})

export default cacheState
