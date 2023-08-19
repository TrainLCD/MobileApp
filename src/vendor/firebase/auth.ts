import '@react-native-firebase/app'
import auth from '@react-native-firebase/auth'

if (__DEV__) {
  auth().useEmulator('http://127.0.0.1:9099')
}

export default auth
