import { ApolloError, useLazyQuery } from '@apollo/client';
import { LocationObject } from 'expo-location';
import gql from 'graphql-tag';
import { useCallback, useEffect } from 'react';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { NearbyStationsData } from '../models/StationAPI';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import useConnectivity from './useConnectivity';

type PickedLocation = Pick<LocationObject, 'coords'>;

const useFetchNearbyStation = (): [
  (location: PickedLocation) => Promise<void>,
  boolean,
  ApolloError | undefined
] => {
  const [{ station }, setStation] = useRecoilState(stationState);
  const setNavigation = useSetRecoilState(navigationState);

  const NEARBY_STATIONS_TYPE = gql`
    query StationByCoords($latitude: Float!, $longitude: Float!) {
      nearbyStations(latitude: $latitude, longitude: $longitude) {
        id
        groupId
        name
        nameK
        nameR
        nameZh
        nameKo
        address
        distance
        latitude
        longitude
        stationNumbers {
          lineSymbolColor
          stationNumber
          lineSymbol
        }
        lines {
          id
          companyId
          lineColorC
          name
          nameR
          nameK
          nameZh
          nameKo
          lineType
          lineSymbols {
            lineSymbol
          }
        }
      }
    }
  `;

  const [getStation, { loading, error, data }] =
    useLazyQuery<NearbyStationsData>(NEARBY_STATIONS_TYPE, {
      notifyOnNetworkStatusChange: true,
    });
  const isInternetAvailable = useConnectivity();

  const fetchStation = useCallback(
    async (location: PickedLocation | undefined) => {
      if (!isInternetAvailable || !location?.coords) {
        return;
      }

      const { latitude, longitude } = location.coords;

      await getStation({
        variables: {
          latitude,
          longitude,
        },
      });
    },
    [getStation, isInternetAvailable]
  );

  useEffect(() => {
    if (
      !data?.nearbyStations[0] ||
      // １度駅を取得したらstationがnullになるまで新しい駅で更新しない
      !!station
    ) {
      return;
    }

    setStation((prev) => ({
      ...prev,
      station: data.nearbyStations[0],
    }));
    setNavigation((prev) => ({
      ...prev,
      stationForHeader: data.nearbyStations[0],
    }));
  }, [data?.nearbyStations, setNavigation, setStation, station]);

  return [fetchStation, loading, error];
};

export default useFetchNearbyStation;
