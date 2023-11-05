import { useEffect, useState } from 'react'
import remoteConfig from '@react-native-firebase/remote-config'
import { REMOTE_CONFIG_KEYS } from '../constants'

export const useUnderMaintenance = () => {
  const [underMaintenance, setUnderMaintenance] = useState<boolean>(false)
  useEffect(() => {
    const fetchConfigAsync = async () => {
      await remoteConfig().fetchAndActivate()
      setUnderMaintenance(
        remoteConfig().getBoolean(REMOTE_CONFIG_KEYS.UNDER_MAINTENANCE)
      )
    }
    fetchConfigAsync()
  }, [])

  return underMaintenance
}
