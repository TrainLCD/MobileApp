import { useEffect, useState } from 'react'
import remoteConfig from '@react-native-firebase/remote-config'
import { REMOTE_CONFIG_KEYS, REMOTE_CONFIG_PLACEHOLDERS } from '../constants'

export const useUnderMaintenance = () => {
  const [underMaintenance, setUnderMaintenance] = useState<boolean>(
    REMOTE_CONFIG_PLACEHOLDERS.UNDER_MAINTENANCE
  )
  useEffect(() => {
    setUnderMaintenance(
      remoteConfig().getBoolean(REMOTE_CONFIG_KEYS.UNDER_MAINTENANCE)
    )
  }, [])

  return underMaintenance
}
