import { useNavigation } from '@react-navigation/native'
import * as Linking from 'expo-linking'
import { useEffect } from 'react'
import { Alert } from 'react-native'
import { translate } from '../translation'
import useMirroringShare from './useMirroringShare'

const useDeepLink = (): void => {
  const navigation = useNavigation()
  const { subscribe: subscribeMirroringShare } = useMirroringShare()
  const url = Linking.useURL()

  useEffect(() => {
    if (!url) {
      return
    }
    const handleUrlAsync = async () => {
      if (
        url.startsWith('trainlcd://ms/') ||
        url.startsWith('trainlcd-canary://ms/')
      ) {
        const msid = url.split('/').pop()
        if (msid) {
          try {
            await subscribeMirroringShare(msid)
            navigation.navigate('MainStack', { screen: 'Main' })
          } catch (err) {
            const msg = (err as { message: string }).message
            Alert.alert(translate('errorTitle'), msg)
          }
        }
      }
    }
    handleUrlAsync()
  }, [navigation, subscribeMirroringShare, url])
}

export default useDeepLink
