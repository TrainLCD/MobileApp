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
        // eslint-disable-next-line no-underscore-dangle
        switch (responseObject.__typename) {
          case 'Station':
            return `${responseObject.__typename}_${responseObject.groupId}_${responseObject.id}`;
          case 'Line':
            if (responseObject.transferStation) {
              return `${responseObject.__typename}_${responseObject.id}_${
                (responseObject.transferStation as Station).id
              }`;
            }
            return `${responseObject.__typename}_${responseObject.id}`;

          default:
            return defaultDataIdFromObject(responseObject);
        }
      },
    }),
  });

export default getClient;
