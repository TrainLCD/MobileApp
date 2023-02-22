/* eslint-disable no-underscore-dangle */
import { ApolloClient, InMemoryCache } from '@apollo/client';

const NON_PROD_API_URL = __DEV__
  ? process.env.API_URL_DEV
  : process.env.API_URL_STG;

const getClient = (dev: boolean): ApolloClient<unknown> =>
  new ApolloClient({
    uri: dev ? NON_PROD_API_URL : process.env.API_URL_PROD,
    cache: new InMemoryCache(),
  });

export default getClient;
