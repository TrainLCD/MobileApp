import { useCallback, useEffect } from 'react';
import gql from 'graphql-tag';
import { useSetRecoilState } from 'recoil';
import { ApolloError, useLazyQuery } from '@apollo/client';
import { StationsByLineIdData } from '../models/StationAPI';
import stationState from '../store/atoms/station';

const useStationList = (): [(lineId: number) => void, boolean, ApolloError] => {
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
            name
            nameK
            nameR
            nameZh
            nameKo
            color
            line {
              id
              name
            }
          }
        }
      }
    }
  `;

  const [getStations, { loading, error, data }] =
    useLazyQuery<StationsByLineIdData>(STATIONS_BY_LINE_ID_TYPE, {
      fetchPolicy: 'no-cache',
    });

  const fetchStationListWithTrainTypes = useCallback(
    (lineId: number) => {
      getStations({
        variables: {
          lineId,
        },
      });
    },
    [getStations]
  );

  useEffect(() => {
    if (data?.stationsByLineId) {
      setStation((prev) => ({
        ...prev,
        stations: data.stationsByLineId,
        // 再帰的にTrainTypesは取れないのでバックアップしておく
        stationsWithTrainTypes: data.stationsByLineId,
      }));
    }
  }, [data, setStation]);

  return [fetchStationListWithTrainTypes, loading, error];
};

export default useStationList;
