import { createPromiseClient } from '@connectrpc/connect'
import { useMemo } from 'react'
import {
  DEV_API_URL,
  PRODUCTION_API_URL,
  STAGING_API_URL,
} from 'react-native-dotenv'
import { StationAPI } from '../../gen/proto/stationapi_connect'
import { createXHRGrpcWebTransport } from '../utils/customTransport'
import { isDevApp } from '../utils/isDevApp'

const useGRPC = () => {
  const baseUrl = useMemo(() => {
    if (__DEV__) {
      return DEV_API_URL
    }

    return isDevApp ? STAGING_API_URL : PRODUCTION_API_URL
  }, [])

  const client = createPromiseClient(
    StationAPI,
    createXHRGrpcWebTransport({
      baseUrl,
    })
  )
  return client
}

export default useGRPC
