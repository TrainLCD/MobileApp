import remoteConfig from '@react-native-firebase/remote-config'
import { useCallback, useEffect, useState } from 'react'
import { Config, ConfigTypeMap } from '../models/RemoteConfig'

const useRemoteConfig = (): {
  config: Config
  flushCache: () => void
} => {
  const [config, setConfig] = useState<Config>({})

  useEffect(() => {
    const fetchConfigAsync = async () => {
      await remoteConfig().fetchAndActivate()

      const values = remoteConfig().getAll()

      Object.entries(values).forEach(([keyStr, value]) => {
        const key = keyStr as keyof Config
        const configType = ConfigTypeMap[key]

        switch (configType) {
          case 'string':
            setConfig((prev) => ({ ...prev, [key]: value.asString() }))
            break
          default:
            break
        }
      })
    }
    fetchConfigAsync()
  }, [setConfig])

  const flushCache = useCallback(() => setConfig({}), [setConfig])

  return {
    config,
    flushCache,
  }
}

export default useRemoteConfig
