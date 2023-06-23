import { useEffect, useMemo } from 'react'
import { DEV_API_URL } from 'react-native-dotenv'
import { useRecoilState, useRecoilValue } from 'recoil'
import { StationAPIClient } from '../gen/StationapiServiceClientPb'
import devState from '../store/atoms/dev'
import grpcState from '../store/atoms/grpc'
import useRemoteConfig from '../utils/useRemoteConfig'

const useGRPC = () => {
  const [{ cachedClient }, setGRPC] = useRecoilState(grpcState)
  const { devMode } = useRecoilValue(devState)
  const {
    config: { station_api_url, dev_mode_station_api_url },
  } = useRemoteConfig()

  const apiUrl = useMemo(() => {
    if (__DEV__) {
      return DEV_API_URL
    }

    return devMode ? dev_mode_station_api_url : station_api_url
  }, [devMode, dev_mode_station_api_url, station_api_url])

  useEffect(() => {
    if (cachedClient || !apiUrl) {
      return
    }

    const client = new StationAPIClient(apiUrl)
    setGRPC((prev) => ({
      ...prev,
      cachedClient: client,
    }))
  }, [
    apiUrl,
    cachedClient,
    devMode,
    dev_mode_station_api_url,
    setGRPC,
    station_api_url,
  ])

  return cachedClient
}

export default useGRPC
