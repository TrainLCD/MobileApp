import { ApolloError, useLazyQuery } from '@apollo/client';
import { LocationObject } from 'expo-location';
import gql from 'graphql-tag';
import { useCallback } from 'react';
import { useSetRecoilState } from 'recoil';
import { NearbyStationsData } from '../models/StationAPI';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';

type PickedLocation = Pick<LocationObject, 'coords'>;

const useFetchNearbyStation = (): [
  (location: PickedLocation) => Promise<void>,
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
        stationNumbers {
          lineSymbolColor
          stationNumber
          lineSymbol
          lineSymbolShape
        }
        currentLine {
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
            lineSymbolShape
          }
          company {
            nameR
            nameEn
          }
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
            lineSymbolShape
          }
          company {
            nameR
            nameEn
          }

          transferStation {
            id
            name
            nameK
            nameR
            nameZh
            nameKo
            stationNumbers {
              lineSymbolColor
              stationNumber
              lineSymbol
              lineSymbolShape
            }
          }
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
            lineSymbolShape
          }
        }
      }
    }
  `;

  const [getStation, { loading, error }] =
    useLazyQuery<NearbyStationsData>(NEARBY_STATIONS_TYPE);

  const fetchStation = useCallback(
    async (location: PickedLocation | undefined) => {
      if (!location?.coords) {
        return;
      }

      const { latitude, longitude } = location.coords;

      const { data } = await getStation({
        variables: {
          latitude,
          longitude,
        },
      });

      if (data?.nearbyStations) {
        setStation((prev) => ({
          ...prev,
          station: data.nearbyStations[0],
        }));
        setNavigation((prev) => ({
          ...prev,
          stationForHeader: data.nearbyStations[0],
        }));
      }
    },
    [getStation, setNavigation, setStation]
  );

  return [fetchStation, loading, error];
};

export default useFetchNearbyStation;
