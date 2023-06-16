import AsyncStorage from '@react-native-async-storage/async-storage'
import * as firestore from '@react-native-firebase/firestore'
import { useCallback, useEffect } from 'react'
import { Alert } from 'react-native'
import { useRecoilState } from 'recoil'
import { ASYNC_STORAGE_KEYS } from '../constants/asyncStorageKeys'
import devState from '../store/atoms/dev'
import { translate } from '../translation'
import useCachedInitAnonymousUser from './useCachedAnonymousUser'

const useDevToken = (): {
  checkEligibility: (
    newToken: string
  ) => Promise<'eligible' | 'ineligible' | 'notMatched'>
} => {
  const user = useCachedInitAnonymousUser()
  const [{ token }, setDevState] = useRecoilState(devState)

  const checkEligibility = useCallback(
    async (
      newToken: string
    ): Promise<'eligible' | 'ineligible' | 'notMatched'> => {
      if (!user) {
        return 'notMatched'
      }
      try {
        const devTokenDoc = await firestore
          .default()
          .collection('devTokens')
          .doc(newToken)
          .get()

        return devTokenDoc.get('eligible') ? 'eligible' : 'ineligible'
      } catch (err) {
        return 'notMatched'
      }
    },
    [user]
  )

  useEffect(() => {
    const updateDevStateFromStorageAsync = async () => {
      const devModeFlagFromStorage =
        (await AsyncStorage.getItem(ASYNC_STORAGE_KEYS.DEV_MODE_ENABLED)) ===
        'true'

      if (devModeFlagFromStorage) {
        const tokenFromStorage = await AsyncStorage.getItem(
          ASYNC_STORAGE_KEYS.DEV_MODE_TOKEN
        )
        setDevState((prev) => ({
          ...prev,
          devMode: true,
          token: tokenFromStorage,
        }))
      }
    }
    updateDevStateFromStorageAsync()
  }, [setDevState])

  useEffect(() => {
    const f = async () => {
      if (token) {
        const eligibility = await checkEligibility(token)
        if (eligibility === 'ineligible') {
          setDevState((prev) => ({
            ...prev,
            devMode: false,
            token: null,
          }))

          await AsyncStorage.removeItem(ASYNC_STORAGE_KEYS.DEV_MODE_ENABLED)
          await AsyncStorage.removeItem(ASYNC_STORAGE_KEYS.DEV_MODE_TOKEN)
          Alert.alert(
            translate('notice'),
            translate('ineligibleDevModeDescription'),
            [{ text: 'OK' }]
          )
        }
      }
    }
    f()
  }, [checkEligibility, setDevState, token])

  return { checkEligibility }
}

export default useDevToken
