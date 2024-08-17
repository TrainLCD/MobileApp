import { useEffect } from 'react'
import { PermissionsAndroid, Platform } from 'react-native'

const useListenMessaging = () => {
  useEffect(() => {
    const requestPermissionAsync = async () => {
      if (Platform.OS === 'android') {
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        )
      }
    }
    requestPermissionAsync()
  }, [])
}
export default useListenMessaging
