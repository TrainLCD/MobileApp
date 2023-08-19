import '@react-native-firebase/app'
import database from '@react-native-firebase/database'

if (__DEV__) {
  database().useEmulator('127.0.0.1', 9000)
}

export default database
