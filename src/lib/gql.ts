import { ApolloClient, InMemoryCache } from '@apollo/client';
import { BatchHttpLink } from '@apollo/client/link/batch-http';
import DeviceInfo from 'react-native-device-info';
import {
  DEV_API_URL,
  PRODUCTION_API_URL,
  STAGING_API_URL,
} from 'react-native-dotenv';
import { isDevApp } from '~/utils/isDevApp';

const assertUrl = (name: string, value?: string | null): string => {
  if (value === undefined || value === null || value.trim() === '') {
    throw new Error(
      `[GraphQL Client Configuration Error] Missing or empty ${name}. Please check your .env.local file and ensure the ${name} is properly configured.`,
    );
  }
  return value;
};

const uri = (() => {
  if (__DEV__ && DeviceInfo.isEmulatorSync()) {
    return assertUrl('DEV_API_URL', DEV_API_URL);
  }

  if (isDevApp) {
    return assertUrl('STAGING_API_URL', STAGING_API_URL);
  }

  return assertUrl('PRODUCTION_API_URL', PRODUCTION_API_URL);
})();

export const gqlClient = new ApolloClient({
  link: new BatchHttpLink({
    uri,
    batchMax: 20,
    batchInterval: 20,
    includeExtensions: false,
  }),
  cache: new InMemoryCache({
    typePolicies: {
      LineNested: { keyFields: false },
      StationNested: { keyFields: false },
      TrainTypeNested: { keyFields: false },
    },
  }),
});
