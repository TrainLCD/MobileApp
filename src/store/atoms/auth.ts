import { atom } from 'recoil'
import { RECOIL_STATES } from '../../constants'

export type AuthState = {
  user: null
}

const authState = atom<AuthState>({
  key: RECOIL_STATES.authState,
  default: {
    user: null,
  },
})

export default authState
