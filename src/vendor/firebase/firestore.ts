import '@react-native-firebase/app'
import firestore from '@react-native-firebase/firestore'

if (__DEV__) {
  firestore().useEmulator('127.0.0.1', 8080)
}

export default firestore
