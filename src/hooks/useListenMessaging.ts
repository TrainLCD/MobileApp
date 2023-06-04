import messaging from '@react-native-firebase/messaging'
import { useEffect } from 'react'
import { Alert } from 'react-native'

const useListenMessaging = () => {
  useEffect(() => {
    const unsubscribe = messaging().onMessage(async (remoteMessage) =>
      Alert.alert(
        remoteMessage.notification?.title ?? '',
        remoteMessage.notification?.body ?? ''
      )
    )

    return unsubscribe
  }, [])
}
export default useListenMessaging
