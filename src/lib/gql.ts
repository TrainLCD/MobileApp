import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';
import DeviceInfo from 'react-native-device-info';
import {
  DEV_API_URL,
  PRODUCTION_API_URL,
  STAGING_API_URL,
} from 'react-native-dotenv';
import { isDevApp } from '~/utils/isDevApp';

/**
 * Validates that all required API URL environment variables are defined and non-empty.
 * @throws {Error} If any required URL is missing or empty, with a descriptive message.
 */
const validateEnvUrls = (): void => {
  const urls = {
    DEV_API_URL,
    STAGING_API_URL,
    PRODUCTION_API_URL,
  };

  const missing: string[] = [];
  const empty: string[] = [];

  for (const [name, value] of Object.entries(urls)) {
    if (value === undefined || value === null) {
      missing.push(name);
    } else if (typeof value === 'string' && value.trim() === '') {
      empty.push(name);
    }
  }

  const errors: string[] = [];
  if (missing.length > 0) {
    errors.push(`Missing environment variables: ${missing.join(', ')}`);
  }
  if (empty.length > 0) {
    errors.push(`Empty environment variables: ${empty.join(', ')}`);
  }

  if (errors.length > 0) {
    const errorMessage = `[GraphQL Client Configuration Error] ${errors.join('; ')}. Please check your .env.local file and ensure all API URLs are properly configured.`;
    throw new Error(errorMessage);
  }
};

// Validate environment variables before attempting to use them
validateEnvUrls();

const uri = (() => {
  if (__DEV__ && DeviceInfo.isEmulatorSync()) {
    return DEV_API_URL;
  }

  return isDevApp ? STAGING_API_URL : PRODUCTION_API_URL;
})();

export const gqlClient = new ApolloClient({
  link: new HttpLink({ uri }),
  cache: new InMemoryCache({
    typePolicies: {
      Station: {
        fields: {
          lines: {
            merge(existing, incoming) {
              // incoming が空配列または undefined の場合でも安全にマージ
              return incoming ?? existing ?? [];
            },
          },
        },
      },
      TrainType: {
        fields: {
          lines: {
            merge(existing, incoming) {
              // incoming が空配列または undefined の場合でも安全にマージ
              return incoming ?? existing ?? [];
            },
          },
        },
      },
    },
  }),
});
