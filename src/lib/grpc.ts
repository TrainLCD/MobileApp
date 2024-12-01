import { createClient } from '@connectrpc/connect'
import { QueryClient } from '@tanstack/react-query'
import { fetch } from 'expo/fetch'
import DeviceInfo from 'react-native-device-info'
import {
  DEV_API_URL,
  PRODUCTION_API_URL,
  STAGING_API_URL,
} from 'react-native-dotenv'
import { StationAPI } from '../../gen/proto/stationapi_connect'
import { createCustomGrpcWebTransport } from '../utils/customTransport'
import { isDevApp } from '../utils/isDevApp'

const baseUrl = (() => {
  if (__DEV__ && DeviceInfo.isEmulatorSync()) {
    return DEV_API_URL
  }

  return isDevApp ? STAGING_API_URL : PRODUCTION_API_URL
})()

export const transport = createCustomGrpcWebTransport({
  baseUrl,
  fetch: fetch as typeof globalThis.fetch,
})

export const grpcClient = createClient(StationAPI, transport)

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
  },
})
