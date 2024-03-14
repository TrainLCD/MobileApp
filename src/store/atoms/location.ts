import { LocationObject } from 'expo-location'
import { atom } from 'recoil'
import { RECOIL_STATES } from '../../constants'

const locationState = atom<LocationObject | null>({
  key: RECOIL_STATES.location,
  default: null,
})

export default locationState
