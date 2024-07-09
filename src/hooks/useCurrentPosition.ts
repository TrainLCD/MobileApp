import { useCallback, useState } from 'react'
import BackgroundGeolocation from 'react-native-background-geolocation'

export const useCurrentPosition = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchCurrentPosition = useCallback(async () => {
    setLoading(true)
    try {
      const pos = await BackgroundGeolocation.getCurrentPosition({
        desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_MEDIUM,
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
