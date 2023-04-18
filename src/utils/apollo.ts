/* eslint-disable no-underscore-dangle */
import {
  ApolloClient,
  InMemoryCache,
  defaultDataIdFromObject,
} from '@apollo/client';
// eslint-disable-next-line import/no-extraneous-dependencies
import { API_URL, DEV_MODE_API_URL } from 'react-native-dotenv';
import type { Station } from '../models/StationAPI';

const getApolloClient = (devMode = false): ApolloClient<unknown> =>
  new ApolloClient({
    uri: devMode ? DEV_MODE_API_URL : API_URL,
    cache: new InMemoryCache({
      dataIdFromObject(responseObject) {
        switch (responseObject.__typename) {
          case 'Station':
            return `${responseObject.__typename}:${responseObject.id}:${responseObject.stopCondition}`;
          case 'Line':
            return `${responseObject.__typename}:${responseObject.id}:${
              (responseObject.transferStation as Station)?.id
            }`;
          case 'TrainType':
          case 'TrainTypeMinimum':
            return `${responseObject.__typename}:${responseObject.groupId}:${responseObject.id}`;
          default:
            return defaultDataIdFromObject(responseObject);
        }
      },
    }),
  });

export default getApolloClient;
