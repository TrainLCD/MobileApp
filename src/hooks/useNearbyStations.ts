import { ApolloError, useLazyQuery } from '@apollo/client';
import { LocationObject } from 'expo-location';
import gql from 'graphql-tag';
import { useCallback, useEffect } from 'react';
import { useSetRecoilState } from 'recoil';
import { NearbyStationsData } from '../models/StationAPI';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';

type PickedLocation = Pick<LocationObject, 'coords'>;

const useNearbyStations = (): [
  (location: PickedLocation) => void,
  boolean,
  ApolloError | undefined
] => {
  const setStation = useSetRecoilState(stationState);
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
        }
      }
    }
  `;

  const [getStation, { loading, error, data }] =
    useLazyQuery<NearbyStationsData>(NEARBY_STATIONS_TYPE);

  const fetchStation = useCallback(
    (location: PickedLocation) => {
      const { latitude, longitude } = location.coords;

      getStation({
        variables: {
          latitude,
          longitude,
        },
      });
    },
    [getStation]
  );

  useEffect(() => {
    if (!data?.nearbyStations[0]) {
      return;
    }

    setStation((prev) => ({
      ...prev,
      station: data?.nearbyStations[0],
    }));
    setNavigation((prev) => ({
      ...prev,
      stationForHeader: data?.nearbyStations[0],
    }));
  }, [data, setNavigation, setStation]);

  return [fetchStation, loading, error];
};

export default useNearbyStations;
