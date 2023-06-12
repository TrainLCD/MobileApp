/* eslint-disable no-underscore-dangle */
import {
  ApolloClient,
  defaultDataIdFromObject,
  InMemoryCache,
  NormalizedCacheObject,
} from '@apollo/client'
import { useMemo } from 'react'
import { Station } from '../models/StationAPI'

/**
 * @deprecated use gRPC instead
 */
const useMyApolloClient = (): ApolloClient<NormalizedCacheObject> | null => {
  const client = useMemo(
    () =>
      new ApolloClient({
        uri: 'https://sapi.tinykitten.me/graphql',
        cache: new InMemoryCache({
          dataIdFromObject(responseObject) {
            switch (responseObject.__typename) {
              case 'Station':
                return `${responseObject.__typename}:${responseObject.id}:${responseObject.stopCondition}`
              case 'Line':
                return `${responseObject.__typename}:${responseObject.id}:${
                  (responseObject.transferStation as Station)?.id
                }`
              case 'TrainType':
              case 'TrainTypeMinimum':
                return `${responseObject.__typename}:${responseObject.groupId}:${responseObject.id}`
              default:
                return defaultDataIdFromObject(responseObject)
            }
          },
        }),
        defaultOptions: {
          watchQuery: {
            notifyOnNetworkStatusChange: true,
          },
        },
      }),
    []
  )

  return client
}

export default useMyApolloClient
