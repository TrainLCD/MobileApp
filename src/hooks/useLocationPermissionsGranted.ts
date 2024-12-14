import * as Location from 'expo-location'
import { useEffect, useState } from 'react'
import { AppState } from 'react-native'

export const useLocationPermissionsGranted = () => {
  const [permissionsGranted, setPermissionsGranted] = useState(true)

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-extra-semi
    ;(async () => {
      const { granted } = await Location.getBackgroundPermissionsAsync()
      setPermissionsGranted(granted)
    })()

    const { remove } = AppState.addEventListener('change', async (state) => {
      if (state === 'active') {
        const { granted } = await Location.getBackgroundPermissionsAsync()
        setPermissionsGranted(granted)
      }
    })
    return remove
  }, [])

  return permissionsGranted
}