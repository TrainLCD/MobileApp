import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';
import DeviceInfo from 'react-native-device-info';
import {
  DEV_API_URL,
  PRODUCTION_API_URL,
  STAGING_API_URL,
} from 'react-native-dotenv';
import { isDevApp } from '~/utils/isDevApp';

const uri = (() => {
  if (__DEV__ && DeviceInfo.isEmulatorSync()) {
    return DEV_API_URL;
  }

  return isDevApp ? STAGING_API_URL : PRODUCTION_API_URL;
})();

export const gqlClient = new ApolloClient({
  link: new HttpLink({ uri }),
  cache: new InMemoryCache(),
});
