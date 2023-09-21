import '@react-native-firebase/app'
import firestore from '@react-native-firebase/firestore'
import { shouldUseEmulator } from './shouldUseEmulator'

if (shouldUseEmulator) {
  firestore().useEmulator('127.0.0.1', 8080)
}

export default firestore
