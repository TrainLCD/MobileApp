import gql from 'graphql-tag';
import { useCallback, useEffect } from 'react';
import { LocationObject } from 'expo-location';
import { useSetRecoilState } from 'recoil';
import { ApolloError, useLazyQuery } from '@apollo/client';
import { StationByCoordsData } from '../models/StationAPI';
import stationState from '../store/atoms/station';
import navigationState from '../store/atoms/navigation';

type PickedLocation = Pick<LocationObject, 'coords'>;

const useStationByCoords = (): [
  (location: PickedLocation) => void,
  boolean,
  ApolloError
] => {
  const setStation = useSetRecoilState(stationState);
  const setNavigation = useSetRecoilState(navigationState);

  const STATION_BY_NAME_TYPE = gql`
    query StationByCoords($latitude: Float!, $longitude: Float!) {
      stationByCoords(latitude: $latitude, longitude: $longitude) {
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
    useLazyQuery<StationByCoordsData>(STATION_BY_NAME_TYPE);

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
    setStation((prev) => ({
      ...prev,
      station: data?.stationByCoords,
    }));
    setNavigation((prev) => ({
      ...prev,
      stationForHeader: data?.stationByCoords,
    }));
  }, [data, setNavigation, setStation]);

  return [fetchStation, loading, error];
};

export default useStationByCoords;
