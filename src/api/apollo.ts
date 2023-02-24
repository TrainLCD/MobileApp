/* eslint-disable no-underscore-dangle */
import {
  ApolloClient,
  defaultDataIdFromObject,
  InMemoryCache,
} from '@apollo/client';
import { Station } from '../models/StationAPI';

const NON_PROD_API_URL = __DEV__
  ? process.env.API_URL_DEV
  : process.env.API_URL_STG;

const getClient = (dev: boolean): ApolloClient<unknown> =>
  new ApolloClient({
    uri: dev ? NON_PROD_API_URL : process.env.API_URL_PROD,
    cache: new InMemoryCache({
      dataIdFromObject(responseObject) {
        switch (responseObject.__typename) {
          case 'Line':
            if (responseObject.transferStation) {
              return `${responseObject.__typename}:${responseObject.id}_${
                (responseObject.transferStation as Station).id
              }`;
            }
            return defaultDataIdFromObject(responseObject);
          default:
            return defaultDataIdFromObject(responseObject);
        }
      },
    }),
  });

export default getClient;
