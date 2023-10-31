import { useNavigation } from '@react-navigation/native'
import * as Linking from 'expo-linking'
import { useCallback, useEffect } from 'react'
import { Alert } from 'react-native'
import { translate } from '../translation'
import useMirroringShare from './useMirroringShare'

const useDeepLink = (): void => {
  const navigation = useNavigation()
  const { subscribe: subscribeMirroringShare } = useMirroringShare()

  const handleDeepLink = useCallback(
    async ({ url }: Linking.EventType) => {
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
    },
    [navigation, subscribeMirroringShare]
  )

  useEffect(() => {
    const processLinkAsync = async () => {
      const initialUrl = await Linking.getInitialURL()
      if (initialUrl) {
        await handleDeepLink({ url: initialUrl })
      }
    }
    processLinkAsync()

    const subscription = Linking.addEventListener('url', handleDeepLink)
    return subscription.remove
  }, [handleDeepLink])
}

export default useDeepLink
