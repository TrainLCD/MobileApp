/* eslint-disable no-underscore-dangle */
import {
  ApolloClient,
  defaultDataIdFromObject,
  InMemoryCache,
  NormalizedCacheObject,
} from '@apollo/client'
import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { Station } from '../models/StationAPI'
import devState from '../store/atoms/dev'
import useRemoteConfig from '../utils/useRemoteConfig'

const useMyApolloClient = (): ApolloClient<NormalizedCacheObject> | null => {
  const { devMode } = useRecoilValue(devState)
  const {
    config: { station_api_url, dev_mode_station_api_url },
  } = useRemoteConfig()

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
    [devMode, dev_mode_station_api_url, station_api_url]
  )

  if (!station_api_url) {
    return null
  }

  return client
}

export default useMyApolloClient
