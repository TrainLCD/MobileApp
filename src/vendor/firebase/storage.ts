import '@react-native-firebase/app'
import storage from '@react-native-firebase/storage'
import { shouldUseEmulator } from './shouldUseEmulator'

if (shouldUseEmulator) {
  storage().useEmulator('127.0.0.1', 9199)
}

export default storage
