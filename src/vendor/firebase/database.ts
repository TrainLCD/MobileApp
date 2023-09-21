import '@react-native-firebase/app'
import database from '@react-native-firebase/database'
import { shouldUseEmulator } from './shouldUseEmulator'

if (shouldUseEmulator) {
  database().useEmulator('127.0.0.1', 9000)
}

export default database
