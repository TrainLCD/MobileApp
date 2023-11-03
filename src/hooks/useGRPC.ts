import { useEffect, useMemo } from 'react'
import {
  DEV_API_URL,
  PRODUCTION_API_URL,
  STAGING_API_URL,
} from 'react-native-dotenv'
import { useRecoilState } from 'recoil'
import { StationAPIClient } from '../gen/StationapiServiceClientPb'
import { isDevApp } from '../utils/isDevApp'
import cacheState from '../store/atoms/cache'

const useGRPC = () => {
  const [{ grpcClient }, setGRPC] = useRecoilState(cacheState)

  const apiUrl = useMemo(() => {
    if (__DEV__) {
      return DEV_API_URL
    }

    return isDevApp ? STAGING_API_URL : PRODUCTION_API_URL
  }, [])

  useEffect(() => {
    if (grpcClient || !apiUrl) {
      return
    }

    const client = new StationAPIClient(apiUrl)
    setGRPC((prev) => ({
      ...prev,
      cachedClient: client,
    }))
  }, [apiUrl, grpcClient, setGRPC])

  return grpcClient
}

export default useGRPC
