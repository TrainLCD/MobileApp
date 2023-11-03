import { useEffect, useMemo } from 'react'
import {
  DEV_API_URL,
  PRODUCTION_API_URL,
  STAGING_API_URL,
} from 'react-native-dotenv'
import { useRecoilState } from 'recoil'
import { StationAPIClient } from '../gen/StationapiServiceClientPb'
import grpcState from '../store/atoms/grpc'
import { isDevApp } from '../utils/isDevApp'

const useGRPC = () => {
  const [{ cachedClient }, setGRPC] = useRecoilState(grpcState)

  const apiUrl = useMemo(() => {
    if (__DEV__) {
      return DEV_API_URL
    }

    return isDevApp ? STAGING_API_URL : PRODUCTION_API_URL
  }, [])

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
