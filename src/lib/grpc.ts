import { createClient } from '@connectrpc/connect';
import { createGrpcWebTransport } from '@connectrpc/connect-web';
import { QueryClient } from '@tanstack/react-query';
import DeviceInfo from 'react-native-device-info';
import {
  DEV_API_URL,
  PRODUCTION_API_URL,
  STAGING_API_URL,
} from 'react-native-dotenv';
import { StationAPI } from '../../gen/proto/stationapi_connect';
import { isDevApp } from '../utils/isDevApp';

const baseUrl = (() => {
  if (__DEV__ && DeviceInfo.isEmulatorSync()) {
    return DEV_API_URL;
  }

  return isDevApp ? STAGING_API_URL : PRODUCTION_API_URL;
})();

export const transport = createGrpcWebTransport({
  baseUrl,
  fetch: (url, init) =>
    fetch(url as string, {
      ...init,
      body: init?.body ?? undefined,
      signal: init?.signal ?? undefined,
      credentials: 'omit',
    }) as unknown as Promise<Response>,
});

export const grpcClient = createClient(StationAPI, transport);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
  },
});
