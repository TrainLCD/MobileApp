import database, { DataSnapshot } from '@react-native-firebase/database'
import { useCallback } from 'react'
import { isDevApp } from '../utils/isDevApp'
import useCachedInitAnonymousUser from './useCachedAnonymousUser'

export const usePubSub = <T>() => {
  const user = useCachedInitAnonymousUser()

  const subscribe = useCallback(
    async (topic: string, callback: (snapshot: DataSnapshot) => void) => {
      if (!user || !isDevApp) {
        return
      }

      database().ref(`pubsub/${topic}`).on('value', callback)

      return () => database().ref(`/pubsub/${topic}`).off('value', callback)
    },
    [user]
  )

  const publish = useCallback((topic: string, payload: T) => {
    if (!isDevApp) {
      return
    }

    return database().ref(`pubsub/${topic}`).set(payload)
  }, [])

  return { subscribe, publish }
}
