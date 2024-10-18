import * as Location from 'expo-location'
import { useEffect } from 'react'
import { useLocationStore } from './useLocationStore'
import { usePubSub } from './usePubSub'

export const usePublishLocation = () => {
  const { publish } = usePubSub()
  const latitude = useLocationStore((store) => store?.coords.latitude)
  const longitude = useLocationStore((store) => store?.coords.longitude)
  const accuracy = useLocationStore((store) => store?.coords.accuracy)

  useEffect(() => {
    const publishAsync = async () => {
      const status = await Location.getProviderStatusAsync()
      if (!status.gpsAvailable) {
        return
      }

      return publish('mirroring', { latitude, longitude, accuracy })
    }

    publishAsync()
  }, [accuracy, latitude, longitude, publish])
}
