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
    if (cachedClient || !dev_mode_station_api_url || !station_api_url) {
      return
    }

    const apiUrl =
      (__DEV__ ? dev_mode_station_api_url : station_api_url) ??
      'http://localhost:50051/'
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
