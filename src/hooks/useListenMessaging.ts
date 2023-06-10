import messaging from '@react-native-firebase/messaging'
import { useEffect } from 'react'
import { Alert, PermissionsAndroid } from 'react-native'

const useListenMessaging = () => {
  useEffect(() => {
    const requestPermissionAsync = async () => {
      await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      )
      await messaging().requestPermission()
    }
    requestPermissionAsync()

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
