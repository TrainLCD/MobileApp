/* eslint-disable no-underscore-dangle */
import {
  ApolloClient,
  defaultDataIdFromObject,
  InMemoryCache,
  NormalizedCacheObject,
} from '@apollo/client';
// eslint-disable-next-line import/no-extraneous-dependencies
import { API_URL } from 'react-native-dotenv';
import { Station } from '../models/StationAPI';

const useMyApolloClient = (): ApolloClient<NormalizedCacheObject> => {
  return new ApolloClient({
    uri: API_URL,
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
    defaultOptions: {
      watchQuery: {
        notifyOnNetworkStatusChange: true,
      },
    },
  });
};

export default useMyApolloClient;
