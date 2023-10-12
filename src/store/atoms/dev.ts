import { atom } from 'recoil'
import RECOIL_STATES from '../../constants/state'
import { isDevApp } from '../../utils/isDevApp'

export interface DevState {
  devMode: boolean
}

const devState = atom<DevState>({
  key: RECOIL_STATES.dev,
  default: {
    devMode: isDevApp || __DEV__,
  },
})

export default devState
