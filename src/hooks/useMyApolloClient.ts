/* eslint-disable no-underscore-dangle */
import {
  ApolloClient,
  defaultDataIdFromObject,
  InMemoryCache,
  NormalizedCacheObject,
} from '@apollo/client';
// eslint-disable-next-line import/no-extraneous-dependencies
import { useRecoilValue } from 'recoil';
import { Station } from '../models/StationAPI';
import devState from '../store/atoms/dev';

const useMyApolloClient = (): ApolloClient<NormalizedCacheObject> => {
  const { devMode } = useRecoilValue(devState);

  return new ApolloClient({
    uri: 'https://sapi.stg.tinykitten.me/graphql',
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
