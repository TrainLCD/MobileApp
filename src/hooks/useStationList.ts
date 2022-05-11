import { ApolloError, useLazyQuery } from '@apollo/client';
import gql from 'graphql-tag';
import { useCallback, useEffect } from 'react';
import { useSetRecoilState } from 'recoil';
import { StationsByLineIdData } from '../models/StationAPI';
import stationState from '../store/atoms/station';
import useConnectivity from './useConnectivity';

const useStationList = (): [
  (lineId: number) => void,
  boolean,
  ApolloError | undefined
] => {
  const setStation = useSetRecoilState(stationState);

  const STATIONS_BY_LINE_ID_TYPE = gql`
    query StationsByLineId($lineId: ID!) {
      stationsByLineId(lineId: $lineId) {
        id
        groupId
        name
        nameK
        nameR
        nameZh
        nameKo
        address
        latitude
        longitude
        fullStationNumber
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
        trainTypes {
          id
          typeId
          groupId
          name
          nameR
          nameZh
          nameKo
          color
          lines {
            id
            name
            nameR
            nameK
            lineColorC
            companyId
            company {
              nameR
              nameEn
            }
          }
          allTrainTypes {
            id
            groupId
            typeId
            name
            nameK
            nameR
            nameZh
            nameKo
            color
            line {
              id
              name
              nameR
              lineColorC
            }
          }
        }
      }
    }
  `;

  const [getStations, { loading, error, data }] =
    useLazyQuery<StationsByLineIdData>(STATIONS_BY_LINE_ID_TYPE, {
      fetchPolicy: 'network-only',
      notifyOnNetworkStatusChange: true,
    });

  const isInternetAvailable = useConnectivity();

  const fetchStationListWithTrainTypes = useCallback(
    (lineId: number) => {
      if (!isInternetAvailable) {
        return;
      }

      getStations({
        variables: {
          lineId,
        },
      });
    },
    [getStations, isInternetAvailable]
  );

  useEffect(() => {
    if (data?.stationsByLineId?.length) {
      setStation((prev) => ({
        ...prev,
        stations: data.stationsByLineId,
        rawStations: data.stationsByLineId,
        // 再帰的にTrainTypesは取れないのでバックアップしておく
        stationsWithTrainTypes: data.stationsByLineId,
      }));
    }
  }, [data, setStation]);

  return [fetchStationListWithTrainTypes, loading, error];
};

export default useStationList;
