/* eslint-disable no-underscore-dangle */
import {
  ApolloClient,
  defaultDataIdFromObject,
  InMemoryCache,
  NormalizedCacheObject,
} from '@apollo/client';
import { useMemo } from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import { API_URL, DEV_MODE_API_URL } from 'react-native-dotenv';
import { useRecoilValue } from 'recoil';
// eslint-disable-next-line import/no-extraneous-dependencies
import { Station } from '../models/StationAPI';
import devState from '../store/atoms/dev';

const useMyApolloClient = (): ApolloClient<NormalizedCacheObject> => {
  const { devMode } = useRecoilValue(devState);

  const cache = useMemo(
    () =>
      new InMemoryCache({
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
    []
  );

  const uri = useMemo(() => (devMode ? DEV_MODE_API_URL : API_URL), [devMode]);

  const client = useMemo(
    () =>
      new ApolloClient({
        uri,
        cache,
      }),
    [uri, cache]
  );

  return client;
};

export default useMyApolloClient;
