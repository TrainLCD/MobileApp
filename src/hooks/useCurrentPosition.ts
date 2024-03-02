import * as Location from 'expo-location'
import { useCallback, useState } from 'react'

export const useCurrentPosition = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchCurrentPosition = useCallback(async () => {
    setLoading(true)
    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      })
      setLoading(false)
      return pos
    } catch (err) {
      setLoading(false)
      setError(err as Error)
    }
  }, [])

  return { fetchCurrentPosition, loading, error }
}
