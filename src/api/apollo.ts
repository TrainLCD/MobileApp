/* eslint-disable no-underscore-dangle */
import {
  ApolloClient,
  defaultDataIdFromObject,
  InMemoryCache,
} from '@apollo/client';
// eslint-disable-next-line import/no-extraneous-dependencies
import { API_URL, DEV_MODE_API_URL } from 'react-native-dotenv';
import { Station } from '../models/StationAPI';

const getClient = (devMode: boolean): ApolloClient<unknown> =>
  new ApolloClient({
    uri: devMode && DEV_MODE_API_URL ? DEV_MODE_API_URL : API_URL,
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
          case 'TrainType':
          case 'TrainTypeMinimum':
            return `${responseObject.__typename}:${responseObject.groupId}`;
          default:
            return defaultDataIdFromObject(responseObject);
        }
      },
    }),
  });

export default getClient;
