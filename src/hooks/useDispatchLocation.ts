import * as Location from 'expo-location'
import { useEffect, useState } from 'react'
import { useSetRecoilState } from 'recoil'
import locationState from '../store/atoms/location'

const useDispatchLocation = (): [boolean, Error] => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error>()
  const setLocation = useSetRecoilState(locationState)

  useEffect(() => {
    const f = async (): Promise<void> => {
      try {
        setLoading(true)
        const { status } = await Location.getForegroundPermissionsAsync()
        const granted = status === Location.PermissionStatus.GRANTED
        if (granted) {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          })
          setLocation((prev) => ({
            ...prev,
            location,
          }))
        }
        setLoading(false)
      } catch (err) {
        setError(err as Error)
        setLoading(false)
      }
    }
    f()
  }, [setLocation])
  return [loading, error as Error]
}

export default useDispatchLocation
