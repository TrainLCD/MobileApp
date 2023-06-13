import { useEffect } from 'react'
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

  useEffect(() => {
    const apiUrl = devMode ? dev_mode_station_api_url : station_api_url

    if (cachedClient || !apiUrl) {
      return
    }

    const client = new StationAPIClient(apiUrl)
    setGRPC((prev) => ({
      ...prev,
      cachedClient: client,
    }))
  }, [
    cachedClient,
    devMode,
    dev_mode_station_api_url,
    setGRPC,
    station_api_url,
  ])

  return cachedClient
}

export default useGRPC
