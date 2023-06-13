import { APP_ENV } from 'react-native-dotenv'
import { atom } from 'recoil'
import RECOIL_STATES from '../../constants/state'

export interface DevState {
  devMode: boolean
  token: string | null
}

const devState = atom<DevState>({
  key: RECOIL_STATES.dev,
  default: {
    devMode: __DEV__ || APP_ENV !== 'production',
    token: null,
  },
})

export default devState
