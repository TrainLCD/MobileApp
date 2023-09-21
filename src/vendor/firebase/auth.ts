import '@react-native-firebase/app'
import auth from '@react-native-firebase/auth'
import { shouldUseEmulator } from './shouldUseEmulator'

if (shouldUseEmulator) {
  auth().useEmulator('http://127.0.0.1:9099')
}

export default auth
