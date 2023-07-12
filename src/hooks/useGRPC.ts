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
    config: { production_grpc_url, staging_grpc_url },
  } = useRemoteConfig()

  const apiUrl = useMemo(() => {
    if (__DEV__) {
      return DEV_API_URL
    }

    return devMode ? staging_grpc_url : production_grpc_url
  }, [devMode, production_grpc_url, staging_grpc_url])

  useEffect(() => {
    if (cachedClient || !apiUrl) {
      return
    }

    const client = new StationAPIClient(apiUrl)
    setGRPC((prev) => ({
      ...prev,
      cachedClient: client,
    }))
  }, [apiUrl, cachedClient, setGRPC])

  return cachedClient
}

export default useGRPC
