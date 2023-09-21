import { APP_ENV } from 'react-native-dotenv'
import { atom } from 'recoil'
import RECOIL_STATES from '../../constants/state'
import { isDevApp } from '../../utils/isDevApp'

export interface DevState {
  devMode: boolean
}

const devState = atom<DevState>({
  key: RECOIL_STATES.dev,
  default: {
    devMode: APP_ENV !== 'production' || isDevApp || __DEV__,
  },
})

export default devState
