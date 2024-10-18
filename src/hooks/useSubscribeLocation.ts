import * as Location from 'expo-location'
import { useEffect } from 'react'
import { useLocationStore } from './useLocationStore'
import { usePubSub } from './usePubSub'

export const useSubscribeLocation = () => {
  const { subscribe } = usePubSub()

  useEffect(() => {
    const subscribeAsync = async () => {
      const status = await Location.getProviderStatusAsync()
      if (status.gpsAvailable) {
        return
      }

      return subscribe('mirroring', (snapshot) => {
        const val = snapshot.val()
        if (!val) {
          return
        }

        const { accuracy = 0, latitude, longitude } = val

        useLocationStore.setState({
          timestamp: 0,
          coords: {
            accuracy,
            altitude: 0,
            altitudeAccuracy: -1,
            speed: 0,
            heading: 0,
            latitude,
            longitude,
          },
        })
      })
    }

    subscribeAsync()
  }, [subscribe])
}
