import { ApolloError, useLazyQuery } from '@apollo/client';
import { LocationObject } from 'expo-location';
import gql from 'graphql-tag';
import { useCallback, useEffect } from 'react';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { NearbyStationsData } from '../models/StationAPI';
import lineState from '../store/atoms/line';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import useConnectivity from './useConnectivity';

type PickedLocation = Pick<LocationObject, 'coords'>;

const useNearbyStations = (): [
  (location: PickedLocation) => void,
  boolean,
  ApolloError | undefined
] => {
  const setStation = useSetRecoilState(stationState);
  const setNavigation = useSetRecoilState(navigationState);
  const { selectedLine } = useRecoilValue(lineState);

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

  const isInternetAvailable = useConnectivity();

  const fetchStation = useCallback(
    (location: PickedLocation | undefined) => {
      if (!isInternetAvailable || !location) {
        return;
      }

      const { latitude, longitude } = location.coords;

      getStation({
        variables: {
          latitude,
          longitude,
        },
      });
    },
    [getStation, isInternetAvailable]
  );

  useEffect(() => {
    if (!data?.nearbyStations[0] || !!selectedLine) {
      return;
    }

    setStation((prev) => ({
      ...prev,
      station:
        prev.station?.groupId !== data.nearbyStations[0]?.groupId
          ? data.nearbyStations[0]
          : prev.station,
    }));
    setNavigation((prev) => ({
      ...prev,
      stationForHeader:
        prev.stationForHeader?.groupId !== data.nearbyStations[0]?.groupId
          ? data.nearbyStations[0]
          : prev.stationForHeader,
    }));
  }, [data, selectedLine, setNavigation, setStation]);

  return [fetchStation, loading, error];
};

export default useNearbyStations;
