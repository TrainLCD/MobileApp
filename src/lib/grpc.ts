import { createPromiseClient } from '@connectrpc/connect'
import { QueryClient } from '@tanstack/react-query'
import DeviceInfo from 'react-native-device-info'
import {
  DEV_API_URL,
  PRODUCTION_API_URL,
  STAGING_API_URL,
} from 'react-native-dotenv'
import { StationAPI } from '../../gen/proto/stationapi_connect'
import { createXHRGrpcWebTransport } from '../utils/customTransport'
import { isDevApp } from '../utils/isDevApp'

const baseUrl = (() => {
  if (__DEV__ && DeviceInfo.isEmulatorSync()) {
    return DEV_API_URL
  }

  return isDevApp ? STAGING_API_URL : PRODUCTION_API_URL
})()

export const transport = createXHRGrpcWebTransport({
  baseUrl,
})

export const grpcClient = createPromiseClient(StationAPI, transport)

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
  },
})
